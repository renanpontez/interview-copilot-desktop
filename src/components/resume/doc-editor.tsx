import { SuperDocEditor } from "@superdoc-dev/react";
import "@superdoc-dev/react/style.css";
import { useRef, useImperativeHandle, forwardRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SuperDocInstance = {
  export: (options?: { isFinalDoc?: boolean }) => Promise<Blob>;
  activeEditor?: any;
  getEditors?: () => any[];
  [key: string]: any;
};

export interface DocEditorHandle {
  exportDoc: () => Promise<Blob | null>;
  getText: () => string | null;
  addComment: (content: string) => void;
  insertTextAtTop: (text: string) => void;
  findAndComment: (searchText: string, comment: string) => boolean;
}

interface DocEditorProps {
  file: File | null;
  onReady?: (instance: SuperDocInstance) => void;
  onSave?: () => void;
}

export const DocEditor = forwardRef<DocEditorHandle, DocEditorProps>(
  function DocEditor({ file, onReady, onSave }, ref) {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<SuperDocInstance | null>(null);

    useImperativeHandle(ref, () => ({
      exportDoc: async () => {
        const sd = instanceRef.current;
        if (!sd?.export) return null;
        try {
          return await sd.export({ isFinalDoc: true });
        } catch (err) {
          console.error("Export failed:", err);
          return null;
        }
      },
      getText: () => {
        const sd = instanceRef.current;
        if (!sd) return null;
        try {
          // Try ProseMirror editor state first
          const doc = sd.activeEditor?.state?.doc;
          if (doc?.textContent) return doc.textContent;
          // Try getEditors() if available
          const editors = sd.getEditors?.();
          if (editors?.length) {
            return editors
              .map((e: any) => e?.state?.doc?.textContent || "")
              .filter(Boolean)
              .join("\n\n");
          }
          // Try common SuperDoc text access patterns
          if (typeof sd.getText === "function") return sd.getText();
          if (typeof sd.getContent === "function") {
            const content = sd.getContent();
            if (typeof content === "string") return content;
          }
          return null;
        } catch {
          return null;
        }
      },
      addComment: (content: string) => {
        const sd = instanceRef.current;
        if (!sd) return;
        try {
          const editor = sd.activeEditor;
          if (editor?.commands?.addComment) {
            editor.commands.addComment({ content });
          }
        } catch (err) {
          console.error("addComment failed:", err);
        }
      },
      insertTextAtTop: (text: string) => {
        const sd = instanceRef.current;
        if (!sd) return;
        try {
          const editor = sd.activeEditor;
          if (!editor) return;
          // ProseMirror: insert a paragraph at position 1 (after the doc node opening)
          const { state, dispatch } = editor.view || editor;
          if (state && dispatch) {
            const { schema, tr } = state;
            const paragraph = schema.nodes.paragraph;
            if (paragraph) {
              const lines = text.split("\n");
              const nodes = lines.map((line: string) =>
                paragraph.create(null, line ? schema.text(line) : undefined)
              );
              // Insert at position 0 (top of document body)
              let insertTr = tr;
              for (let i = nodes.length - 1; i >= 0; i--) {
                insertTr = insertTr.insert(0, nodes[i]);
              }
              dispatch(insertTr);
            }
          }
        } catch (err) {
          console.error("insertTextAtTop failed:", err);
        }
      },
      findAndComment: (searchText: string, comment: string): boolean => {
        const sd = instanceRef.current;
        if (!sd) return false;
        try {
          const editor = sd.activeEditor;
          if (!editor) return false;
          const { state } = editor.view || editor;
          if (!state) return false;
          // Search the document for the text
          const docText = state.doc.textContent || "";
          const lowerDoc = docText.toLowerCase();
          const lowerSearch = searchText.toLowerCase();
          const index = lowerDoc.indexOf(lowerSearch);
          if (index === -1) return false;
          // Find the actual position in the ProseMirror doc
          let pos = 0;
          let charCount = 0;
          state.doc.descendants((node: any, nodePos: number) => {
            if (pos > 0) return false; // already found
            if (node.isText) {
              const text = node.text || "";
              if (charCount + text.length > index) {
                pos = nodePos + (index - charCount);
                return false;
              }
              charCount += text.length;
            }
          });
          if (pos > 0) {
            // Select the range and add comment
            const { dispatch } = editor.view || editor;
            if (dispatch) {
              const tr = state.tr.setSelection(
                state.selection.constructor.create(
                  state.doc,
                  pos,
                  pos + searchText.length
                )
              );
              dispatch(tr);
            }
            if (editor.commands?.addComment) {
              editor.commands.addComment({ content: comment });
              return true;
            }
          }
          return false;
        } catch (err) {
          console.error("findAndComment failed:", err);
          return false;
        }
      },
    }));

    void onSave; // available for future use

    if (!file) {
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        <div ref={toolbarRef} id="superdoc-toolbar" className="border-b" />
        <div className="flex-1 overflow-auto">
          <SuperDocEditor
            document={file}
            documentMode="editing"
            toolbar="#superdoc-toolbar"
            user={{ name: "InterviewCopilot", email: "bot@interviewcopilot.app" }}
            onReady={(payload: unknown) => {
              const sd =
                (payload as { superdoc?: SuperDocInstance })?.superdoc ??
                (payload as SuperDocInstance);
              instanceRef.current = sd;
              onReady?.(sd);
            }}
          />
        </div>
      </div>
    );
  }
);
