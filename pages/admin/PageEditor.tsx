import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { Page } from "../../types";
import { useToast } from "../../hooks/useToast";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

// --- Toolbar Component ---
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageFromFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) =>
          editor.chain().focus().setImage({ src: e.target?.result as string }).run();
        reader.readAsDataURL(file);
      }
    },
    [editor]
  );

  const setLink = useCallback(() => {
    const url = window.prompt("URL", editor.getAttributes("link").href);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-md transition-colors ${
      isActive ? "bg-slate-700 text-sky-400" : "text-gray-400 hover:bg-slate-700"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive("bulletList"))}
      >
        List
      </button>
      <button
        type="button"
        onClick={addImageFromFile}
        className={buttonClass(false)}
      >
        Image
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <button
        type="button"
        onClick={setLink}
        className={buttonClass(editor.isActive("link"))}
      >
        Link
      </button>
    </div>
  );
};

const PageEditor: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { pages, addPage, updatePage } = useAdmin();
  const { addToast } = useToast();
  const [page, setPage] = useState<Omit<Page, "id"> | Page | null>(null);
  const [originalPage, setOriginalPage] = useState<Omit<Page, "id"> | Page | null>(null);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // THIS IS THE CORRECT AND FINAL ARCHITECTURE.
  // The editor is created ONCE with a stable configuration that is never redefined.
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
    ],
    content: "", // IMPORTANT: Always initialize empty.
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none p-4 h-96 overflow-y-auto focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setPage(prev => prev ? { ...prev, content: editor.getHTML() } : null);
    },
  });

  const hasUnsavedChanges = JSON.stringify(page) !== JSON.stringify(originalPage);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  // This effect is now solely responsible for loading content into the stable editor.
  useEffect(() => {
    if (editor) {
      let pageToLoad: Omit<Page, "id"> | Page;
      if (pageId) {
        pageToLoad = pages.find(p => p.id === pageId) || { title: "Not Found", path: "", content: "" };
      } else {
        pageToLoad = { title: "", path: "", content: "<p>Start writing...</p>" };
      }
      
      setPage(pageToLoad);
      setOriginalPage(pageToLoad);

      if (editor.getHTML() !== pageToLoad.content) {
        editor.commands.setContent(pageToLoad.content, false);
      }
    }
  }, [pageId, pages, editor]);

  const handleSave = async () => {
    if (page) {
      if ("id" in page) {
        await updatePage(page);
        addToast("Page updated!", "success");
        setOriginalPage(JSON.parse(JSON.stringify(page)));
      } else {
        const newPage = await addPage(page);
        addToast("Page created!", "success");
        navigate(`/admin/pages/edit/${newPage.id}`);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (page) {
      setPage({ ...page, [e.target.name]: e.target.value });
    }
  };
  
  const handlePreview = () => {
    if (page) {
      const previewHtml = `
        <!DOCTYPE html><html><head><title>Preview</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;}img{max-width:100%;}</style></head>
        <body><h1>${page.title}</h1><hr><div>${page.content}</div></body></html>
      `;
      const blob = new Blob([previewHtml], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    }
  };

  if (!editor || !page) {
    return <div className="text-white">Loading...</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">
        {pageId ? "Edit Page" : "Create New Page"}
      </h1>
      <div className="space-y-6">
        <input
          type="text"
          name="title"
          placeholder="Page Title"
          value={page.title}
          onChange={handleChange}
          className="w-full p-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <input
          type="text"
          name="path"
          placeholder="/url-path"
          value={page.path}
          onChange={handleChange}
          className="w-full p-2 bg-slate-800 border-2 border-slate-700 rounded-md text-white"
        />
        
        <div className="bg-slate-900 border-2 border-slate-700 rounded-md">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex justify-end mt-8 gap-4">
        <button onClick={handlePreview} className="bg-slate-600 text-white font-bold py-2 px-8 rounded-lg">Preview</button>
        <button 
            onClick={handleSave} 
            className="bg-sky-500 text-white font-bold py-2 px-8 rounded-lg disabled:opacity-50"
            disabled={!hasUnsavedChanges}
        >
          Save Page
        </button>
      </div>
    </div>
  );
};

export default PageEditor;
