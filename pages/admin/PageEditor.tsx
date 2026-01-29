import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePages } from "../../context/PagesContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { Page, HomePageContent, AboutPageContent, ContactPageContent, ContactFormField } from "../../types";
import { useToast } from "../../hooks/useToast";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import ImageUploadInput from "../../components/admin/ImageUploadInput";

// Page type templates with required fields and defaults
const PAGE_TEMPLATES = {
  home: {
    label: "Home Page",
    description: "Hero section with background image, title, and subtitle",
    icon: "🏠",
    title: "Home",
    path: "/",
    defaults: {
      heroTitle: "Welcome to Custom Threads",
      heroSubtitle: "Design Your Imagination",
      heroBackgroundImageUrl: "",
    },
  },
  about: {
    label: "About Us",
    description: "Company story, mission, and values with rich text content",
    icon: "ℹ️",
    title: "About Us",
    path: "/about",
    defaults: {
      aboutPageContent: `<h2>About Our Company</h2><p>Welcome to Custom Threads, where creativity meets quality. We were founded on a simple idea: everyone should be able to wear their imagination.</p><h3>Our Mission</h3><p>Provide high-quality, customizable products with state-of-the-art printing technology and the best materials.</p><h3>Why Choose Us</h3><p>We believe in the power of self-expression and are committed to making the custom design process as easy and enjoyable as possible.</p>`,
    },
  },
  contact: {
    label: "Contact Page",
    description: "Customizable contact form with field builder",
    icon: "📧",
    title: "Contact Us",
    path: "/contact",
    defaults: {
      pageTitle: "Get In Touch",
      pageSubtitle: "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
      targetEmail: "contact@customthreads.com",
      subjectTemplate: "Contact Form Submission: {subject}",
      successMessage: "Thank you for your message! We'll get back to you soon.",
      formFields: [
        { id: "f1", type: "fullName" as const, label: "Full Name", placeholder: "John Doe", required: true, enabled: true },
        { id: "f2", type: "email" as const, label: "Email Address", placeholder: "john@example.com", required: true, enabled: true, validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } },
        { id: "f3", type: "phone" as const, label: "Phone Number", placeholder: "(555) 123-4567", required: false, enabled: true, validation: { pattern: "^[\\d\\s()+-]+$" } },
        { id: "f4", type: "subject" as const, label: "Subject", placeholder: "How can we help?", required: true, enabled: true },
        { id: "f5", type: "message" as const, label: "Message", placeholder: "Your message here...", required: true, enabled: true, validation: { minLength: 10 } },
      ],
    },
  },
  custom: {
    label: "Custom Page",
    description: "Create any page with custom rich text content",
    icon: "📄",
    title: "New Page",
    path: "/new-page",
    defaults: {
      content: "<p>Start writing your content here...</p>",
    },
  },
} as const;

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
          editor
            .chain()
            .focus()
            .setImage({ src: e.target?.result as string })
            .run();
        reader.readAsDataURL(file);
      }
    },
    [editor],
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
      isActive
        ? "bg-slate-700 text-sky-400"
        : "text-gray-400 hover:bg-slate-700"
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
  const { pages, addPage, updatePage } = usePages();
  const { addToast } = useToast();
  const { siteSettings } = useSiteSettings();
  const [page, setPage] = useState<Omit<Page, "id"> | Page | null>(null);
  const [originalPage, setOriginalPage] = useState<
    Omit<Page, "id"> | Page | null
  >(null);
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showPageTypeSelector, setShowPageTypeSelector] = useState(false);

  // DnD sensors must be created unconditionally at the top level to satisfy hook ordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isNewPage = !pageId;

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none p-4 h-96 overflow-y-auto focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setPage((prev) => {
        if (!prev) return null;
        const newPage = { ...prev };
        
        if (newPage.pageType === "home") {
          return newPage;
        } else if (newPage.pageType === "about") {
          newPage.contentData = {
            ...(newPage.contentData as AboutPageContent),
            aboutPageContent: editor.getHTML(),
          };
        } else {
          newPage.content = editor.getHTML();
        }
        
        return newPage;
      });
    },
  });

  const hasUnsavedChanges =
    JSON.stringify(page) !== JSON.stringify(originalPage);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  const handleSelectPageType = (pageType: keyof typeof PAGE_TEMPLATES) => {
    const template = PAGE_TEMPLATES[pageType];
    let contentData: any;
    let content: string | undefined;
    
    // Set up the content structure based on page type
    if (pageType === "home") {
      contentData = {
        ...template.defaults,
        heroBackgroundImageUrl: siteSettings?.siteBackgroundImageUrl || "",
      };
      if (siteSettings?.siteBackgroundImageUrl) {
        setPreviewImageUrl(siteSettings.siteBackgroundImageUrl);
      }
    } else if (pageType === "about" || pageType === "contact") {
      contentData = template.defaults;
    } else {
      // custom pages use content field
      content = (template.defaults as any).content;
    }

    const newPage: Omit<Page, "id"> = {
      title: template.title,
      path: template.path,
      pageType: pageType as any,
      contentData: pageType === "custom" ? undefined : contentData,
      content: pageType === "custom" ? content : undefined,
    };

    setPage(newPage);
    setOriginalPage(newPage);
    setShowPageTypeSelector(false);
    
    // Load content into editor - only for about and custom pages
    if (editor && pageType !== "home" && pageType !== "contact") {
      let contentToLoad = "";
      if (pageType === "about") {
        contentToLoad = (template.defaults as any).aboutPageContent;
      } else if (pageType === "custom") {
        contentToLoad = (template.defaults as any).content;
      }
      if (contentToLoad) {
        editor.commands.setContent(contentToLoad);
      }
    }
  };

  useEffect(() => {
    if (!pageId && !page) {
      setShowPageTypeSelector(true);
      return;
    }

    let pageToLoad: Omit<Page, "id"> | Page;
    if (pageId) {
      pageToLoad =
        pages.find((p) => p.id === pageId) || {
          title: "Not Found",
          path: "",
          content: "",
          pageType: "custom",
        };
    } else {
      return;
    }

    setPage(pageToLoad);
    setOriginalPage(pageToLoad);
    
    if (pageToLoad.pageType === 'home' && pageToLoad.contentData) {
      setPreviewImageUrl((pageToLoad.contentData as HomePageContent).heroBackgroundImageUrl);
    }

    if (editor) {
      let contentToLoad = "";
      
      if (pageToLoad.pageType === "about" && pageToLoad.contentData) {
        contentToLoad = (pageToLoad.contentData as AboutPageContent).aboutPageContent;
      } else if (pageToLoad.pageType === "home") {
        contentToLoad = "";
      } else if (pageToLoad.content) {
        contentToLoad = pageToLoad.content;
      }
      
      if (contentToLoad) {
        const isContentDifferent = editor.getHTML() !== contentToLoad;
        if (isContentDifferent) {
          editor.commands.setContent(contentToLoad);
        }
      }
    }
  }, [pageId, pages, editor, siteSettings?.siteBackgroundImageUrl]);

  const handleSave = async () => {
    if (page) {
      let pageToSave = { ...page };
      
      // Handle home page image
      if (pageToSave.pageType === 'home') {
        let finalImageUrl = (pageToSave.contentData as HomePageContent)?.heroBackgroundImageUrl || '';

        if (selectedImageFile) {
          finalImageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(selectedImageFile);
          });
        } else if (previewImageUrl) {
          finalImageUrl = previewImageUrl;
        }

        pageToSave.contentData = {
          ...(pageToSave.contentData as HomePageContent),
          heroBackgroundImageUrl: finalImageUrl,
        };
      }

      if ("id" in pageToSave) {
        await updatePage(pageToSave);
        addToast("Page updated!", "success");
        setOriginalPage(JSON.parse(JSON.stringify(pageToSave)));
        setSelectedImageFile(null);
      } else {
        // Create new page - no restrictions on Home/About pages anymore
        const newPage = await addPage(pageToSave);
        addToast("Page created!", "success");
        navigate(`/admin/pages/edit/${newPage.id}`);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (page) {
      const { name, value } = e.target;
      setPage({ ...page, [name]: value });
    }
  };

  const handleHomePageContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (page && page.pageType === 'home') {
      const { name, value } = e.target;
      const currentContentData = (page.contentData || {}) as HomePageContent;
      setPage({
        ...page,
        contentData: {
          ...currentContentData,
          [name]: value,
        },
      });
    }
  };

  const handlePreview = () => {
    if (page) {
      navigate('/admin/pages/preview', {
        state: {
          page: page,
        },
      });
    }
  };

  if (!editor) {
    return <div className="text-white">Loading editor...</div>;
  }

  if (showPageTypeSelector && isNewPage) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Create New Page</h1>
        <p className="text-gray-400 mb-8">Select a page type to start. Each type includes the essential fields and starter content.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.entries(PAGE_TEMPLATES) as [keyof typeof PAGE_TEMPLATES, typeof PAGE_TEMPLATES.home][]).map(
            ([key, template]) => (
              <button
                key={key}
                onClick={() => handleSelectPageType(key)}
                className="p-6 bg-slate-800 border-2 border-slate-700 rounded-lg hover:border-sky-500 hover:bg-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{template.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{template.label}</h3>
                <p className="text-gray-400 text-sm mb-4">{template.description}</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  {key === "home" && (
                    <>
                      <li>✓ Hero title & subtitle</li>
                      <li>✓ Background image upload</li>
                      <li>✓ Full page control</li>
                    </>
                  )}
                  {key === "about" && (
                    <>
                      <li>✓ Rich text editor</li>
                      <li>✓ Company story template</li>
                      <li>✓ HTML formatting support</li>
                    </>
                  )}
                  {key === "contact" && (
                    <>
                      <li>✓ Contact template</li>
                      <li>✓ Rich text content</li>
                      <li>✓ Custom layout</li>
                    </>
                  )}
                  {key === "custom" && (
                    <>
                      <li>✓ Custom title & URL</li>
                      <li>✓ Full content editor</li>
                      <li>✓ Images and formatting</li>
                    </>
                  )}
                </ul>
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  if (!page) {
    return <div className="text-white">Loading page...</div>;
  }

  const renderHomePageEditor = () => {
    const content = (page.contentData as HomePageContent) || {};
    return (
      <div className="space-y-4 p-4 bg-slate-800 border-2 border-slate-700 rounded-md">
         <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Hero Title</label>
          <input
            type="text"
            name="heroTitle"
            value={content.heroTitle || ''}
            onChange={handleHomePageContentChange}
            className="w-full p-2 bg-slate-700 border-2 border-slate-600 rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Hero Subtitle</label>
          <input
            type="text"
            name="heroSubtitle"
            value={content.heroSubtitle || ''}
            onChange={handleHomePageContentChange}
            className="w-full p-2 bg-slate-700 border-2 border-slate-600 rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Hero Background Image</label>
          <ImageUploadInput
            label=""
            imageUrl={previewImageUrl || ''}
            onFileSelect={(file) => {
              setSelectedImageFile(file);
              setPreviewImageUrl(URL.createObjectURL(file));
            }}
            onImageUrlChange={() => {}}
          />
        </div>
      </div>
    );
  };

  const renderAboutPageEditor = () => {
    return (
      <div className="bg-slate-900 border-2 border-slate-700 rounded-md">
        <div className="p-3 bg-slate-800 border-b border-slate-700">
          <p className="text-gray-300 text-sm">Edit your About page content below</p>
        </div>
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  };

  const renderContactPageEditor = () => {
    const content = (page.contentData as ContactPageContent) || PAGE_TEMPLATES.contact.defaults;

    const handleContactContentChange = (field: keyof ContactPageContent, value: any) => {
      setPage({
        ...page,
        contentData: {
          ...(page.contentData as ContactPageContent),
          [field]: value,
        },
      });
    };

    const handleFieldUpdate = (fieldId: string, updates: Partial<ContactFormField>) => {
      const fields = [...(content.formFields || [])];
      const index = fields.findIndex(f => f.id === fieldId);
      if (index >= 0) {
        fields[index] = { ...fields[index], ...updates };
        handleContactContentChange('formFields', fields);
      }
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const fields = [...(content.formFields || [])];
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        handleContactContentChange('formFields', arrayMove(fields, oldIndex, newIndex));
      }
    };

    const addCustomField = () => {
      const newField: ContactFormField = {
        id: `custom_${Date.now()}`,
        type: 'text',
        label: 'Custom Field',
        placeholder: 'Enter value',
        required: false,
        enabled: true,
      };
      handleContactContentChange('formFields', [...(content.formFields || []), newField]);
    };

    const deleteField = (fieldId: string) => {
      const fields = content.formFields.filter(f => f.id !== fieldId);
      handleContactContentChange('formFields', fields);
    };

    const SortableField: React.FC<{ field: ContactFormField }> = ({ field }) => {
      const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
      } = useSortable({ id: field.id });

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      };

      return (
        <div ref={setNodeRef} style={style} className="bg-slate-700 p-4 rounded-md border border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white"
              >
                ⋮⋮
              </button>
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(e) => handleFieldUpdate(field.id, { enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <select
                value={field.type}
                onChange={(e) => handleFieldUpdate(field.id, { type: e.target.value as ContactFormField['type'] })}
                className="bg-slate-600 text-white px-2 py-1 rounded text-sm border border-slate-500"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="fullName">Full Name</option>
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="address">Address</option>
                <option value="subject">Subject</option>
                <option value="message">Message</option>
                <option value="select">Select/Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => handleFieldUpdate(field.id, { required: e.target.checked })}
                  className="w-4 h-4"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => deleteField(field.id)}
                className="text-red-400 hover:text-red-300 text-sm px-2"
              >
                Delete
              </button>
            </div>
          </div>
          {field.enabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => handleFieldUpdate(field.id, { placeholder: e.target.value })}
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
              </div>
              
              {field.type === 'select' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={field.options?.join(', ') || ''}
                    onChange={(e) => handleFieldUpdate(field.id, { options: e.target.value.split(',').map(o => o.trim()) })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                  />
                </div>
              )}
              
              <details className="bg-slate-600 rounded p-2">
                <summary className="text-xs text-gray-300 cursor-pointer">Validation Rules</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-gray-400">Regex Pattern</label>
                      <a 
                        href="https://regex101.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        Regex Helper ↗
                      </a>
                    </div>
                    <input
                      type="text"
                      value={field.validation?.pattern || ''}
                      onChange={(e) => handleFieldUpdate(field.id, { 
                        validation: { ...field.validation, pattern: e.target.value || undefined }
                      })}
                      placeholder="e.g., ^[^\s@]+@[^\s@]+\.[^\s@]+$ for email"
                      className="w-full p-1 bg-slate-700 text-white text-xs rounded border border-slate-500"
                    />
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
                        })}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded border border-slate-500"
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, pattern: '^[\\d\\s()+-]+$' }
                        })}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded border border-slate-500"
                      >
                        Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, pattern: '^\\d{5}(-\\d{4})?$' }
                        })}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded border border-slate-500"
                      >
                        ZIP Code
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, pattern: '^https?://.*' }
                        })}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded border border-slate-500"
                      >
                        URL
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Min Length</label>
                      <input
                        type="number"
                        value={field.validation?.minLength || ''}
                        onChange={(e) => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        placeholder="0"
                        className="w-full p-1 bg-slate-700 text-white text-xs rounded border border-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Length</label>
                      <input
                        type="number"
                        value={field.validation?.maxLength || ''}
                        onChange={(e) => handleFieldUpdate(field.id, { 
                          validation: { ...field.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        placeholder="∞"
                        className="w-full p-1 bg-slate-700 text-white text-xs rounded border border-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </details>
              
              <details className="bg-slate-600 rounded p-2">
                <summary className="text-xs text-gray-300 cursor-pointer">Conditional Visibility</summary>
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-400">Show this field only when:</p>
                  {field.conditionalRules?.map((rule, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={rule.fieldId}
                        onChange={(e) => {
                          const rules = [...(field.conditionalRules || [])];
                          rules[idx].fieldId = e.target.value;
                          handleFieldUpdate(field.id, { conditionalRules: rules });
                        }}
                        className="flex-1 p-1 bg-slate-700 text-white text-xs rounded"
                      >
                        <option value="">Select field...</option>
                        {content.formFields.filter(f => f.id !== field.id).map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={rule.operator}
                        onChange={(e) => {
                          const rules = [...(field.conditionalRules || [])];
                          rules[idx].operator = e.target.value as any;
                          handleFieldUpdate(field.id, { conditionalRules: rules });
                        }}
                        className="p-1 bg-slate-700 text-white text-xs rounded"
                      >
                        <option value="equals">equals</option>
                        <option value="notEquals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="notEmpty">is not empty</option>
                      </select>
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => {
                          const rules = [...(field.conditionalRules || [])];
                          rules[idx].value = e.target.value;
                          handleFieldUpdate(field.id, { conditionalRules: rules });
                        }}
                        placeholder="value"
                        className="flex-1 p-1 bg-slate-700 text-white text-xs rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rules = field.conditionalRules?.filter((_, i) => i !== idx);
                          handleFieldUpdate(field.id, { conditionalRules: rules });
                        }}
                        className="text-red-400 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const rules = [...(field.conditionalRules || []), { fieldId: '', operator: 'equals' as const, value: '' }];
                      handleFieldUpdate(field.id, { conditionalRules: rules });
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    + Add Rule
                  </button>
                </div>
              </details>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Page Settings */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Page Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Page Title</label>
              <input
                type="text"
                value={content.pageTitle || ''}
                onChange={(e) => handleContactContentChange('pageTitle', e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Page Subtitle</label>
              <textarea
                value={content.pageSubtitle || ''}
                onChange={(e) => handleContactContentChange('pageSubtitle', e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            </div>
          </div>
        </div>

        {/* Form Configuration */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Form Configuration (Admin Only)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Email Address</label>
              <input
                type="email"
                value={content.targetEmail || ''}
                onChange={(e) => handleContactContentChange('targetEmail', e.target.value)}
                placeholder="contact@example.com"
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Form submissions will be sent to this email</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Subject Template</label>
              <input
                type="text"
                value={content.subjectTemplate || ''}
                onChange={(e) => handleContactContentChange('subjectTemplate', e.target.value)}
                placeholder="Contact Form: {subject}"
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Use {`{subject}`} to insert the subject field value</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Success Message</label>
              <textarea
                value={content.successMessage || ''}
                onChange={(e) => handleContactContentChange('successMessage', e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            </div>
          </div>
        </div>

        {/* Form Fields Builder */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Form Fields</h3>
            <button
              type="button"
              onClick={addCustomField}
              className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-3 py-1 rounded"
            >
              + Add Custom Field
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={content.formFields?.map(f => f.id) || []} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {content.formFields?.map((field) => (
                  <SortableField key={field.id} field={field} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  };

  const renderDefaultEditor = () => (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-md">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {pageId ? `Edit: ${originalPage?.title}` : "Create New Page"}
          </h1>
          {page?.pageType && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-gray-300">
                Type: <span className="text-sky-400 font-semibold">{PAGE_TEMPLATES[page.pageType as keyof typeof PAGE_TEMPLATES]?.label || page.pageType}</span>
              </span>
              {page.pageType === "home" && (
                <span className="text-xs text-gray-500">• Required for the hero section</span>
              )}
              {page.pageType === "about" && (
                <span className="text-xs text-gray-500">• Main company information page</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Page Title</label>
          <input
            type="text"
            name="title"
            placeholder="Page Title"
            value={page.title}
            onChange={handleChange}
            className="w-full p-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={!isNewPage && (page.pageType === 'home' || page.pageType === 'about')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Page URL Path</label>
          <input
            type="text"
            name="path"
            placeholder="/url-path"
            value={page.path}
            onChange={handleChange}
            className="w-full p-2 bg-slate-800 border-2 border-slate-700 rounded-md text-white"
            disabled={!isNewPage && (page.pageType === 'home' || page.pageType === 'about')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {page.pageType === 'home' ? 'Hero Section' : page.pageType === 'about' ? 'Page Content' : page.pageType === 'contact' ? 'Contact Form Builder' : 'Page Content'}
          </label>
          {page.pageType === 'home' ? renderHomePageEditor() : 
           page.pageType === 'about' ? renderAboutPageEditor() : 
           page.pageType === 'contact' ? renderContactPageEditor() : 
           renderDefaultEditor()}
        </div>
      </div>
      <div className="flex justify-end mt-8 gap-4">
        <button
          onClick={handlePreview}
          className="bg-slate-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-slate-700"
        >
          Preview
        </button>
        <button
          onClick={handleSave}
          className="bg-sky-500 text-white font-bold py-2 px-8 rounded-lg disabled:opacity-50 hover:bg-sky-600"
          disabled={!hasUnsavedChanges}
        >
          Save Page
        </button>
      </div>
    </div>
  );
};

export default PageEditor;
