import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { Menu, MenuItem } from "../../types";
import { PlusIcon, TrashIcon } from "../../components/Icons";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const NavigationManagement: React.FC = () => {
  const { menus, pages, updateMenu } = useAdmin();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [originalMenu, setOriginalMenu] = useState<Menu | null>(null);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const hasUnsavedChanges =
    JSON.stringify(currentMenu) !== JSON.stringify(originalMenu);

  // Effect to update the global unsaved changes context
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    // Cleanup function to reset the flag when the component unmounts
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  useEffect(() => {
    if (selectedMenuId) {
      // Deep copy to avoid direct state mutation
      const foundMenu = menus.find((m) => m.id === selectedMenuId);
      if (foundMenu) {
        const deepCopy = JSON.parse(JSON.stringify(foundMenu));
        setCurrentMenu(deepCopy);
        setOriginalMenu(deepCopy); // Store the original state for comparison
      } else {
        setCurrentMenu(null);
        setOriginalMenu(null);
      }
    }
  }, [selectedMenuId, menus]);

  const handleItemChange = (
    itemId: string,
    field: "text" | "url",
    value: string,
  ) => {
    if (!currentMenu) return;
    const updatedItems = currentMenu.items.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item,
    );
    setCurrentMenu({ ...currentMenu, items: updatedItems });
  };

  const addNewItem = () => {
    if (!currentMenu) return;
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      text: "New Link",
      url: "/",
    };
    setCurrentMenu({ ...currentMenu, items: [...currentMenu.items, newItem] });
  };

  const deleteItem = (itemId: string) => {
    if (!currentMenu) return;
    const updatedItems = currentMenu.items.filter((item) => item.id !== itemId);
    setCurrentMenu({ ...currentMenu, items: updatedItems });
  };

  const handleSaveMenu = async () => {
    if (currentMenu) {
      await updateMenu(currentMenu);
      // After saving, the current state becomes the new "original" state
      const deepCopy = JSON.parse(JSON.stringify(currentMenu));
      setOriginalMenu(deepCopy);
      setCurrentMenu(deepCopy);
      addToast(`Menu "${currentMenu.name}" updated successfully!`, "success");
    }
  };

  const handleMenuSelection = (menuId: string) => {
    if (hasUnsavedChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to discard them and switch menus?",
        )
      ) {
        // User confirmed to discard changes, so reset the global flag and switch the menu.
        setHasUnsavedChanges(false);
        setSelectedMenuId(menuId);
      }
    } else {
      // No unsaved changes, so switch freely.
      setSelectedMenuId(menuId);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (currentMenu && over && active.id !== over.id) {
      const oldIndex = currentMenu.items.findIndex(
        (item) => item.id === active.id,
      );
      const newIndex = currentMenu.items.findIndex(
        (item) => item.id === over.id,
      );

      const newItems = arrayMove(currentMenu.items, oldIndex, newIndex);
      setCurrentMenu({ ...currentMenu, items: newItems });
    }
  }

  const builtInPages = [
    { title: "Home", path: "/" },
    { title: "Store", path: "/store" },
    { title: "About", path: "/about" },
    { title: "Contact", path: "/contact" },
    { title: "Cart", path: "/cart" },
    { title: "Login", path: "/login" },
  ];

  const DragHandleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
      <circle cx="5" cy="5" r="1"></circle>
      <circle cx="5" cy="12" r="1"></circle>
      <circle cx="5" cy="19" r="1"></circle>
      <circle cx="19" cy="5" r="1"></circle>
      <circle cx="19" cy="12" r="1"></circle>
      <circle cx="19" cy="19" r="1"></circle>
    </svg>
  );

  interface SortableMenuItemProps {
    item: MenuItem;
  }

  const SortableMenuItem: React.FC<SortableMenuItemProps> = ({ item }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : "auto",
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`p-4 bg-slate-700 rounded-md border border-slate-600 ${isDragging ? "ring-2 ring-sky-500 shadow-lg" : ""}`}
      >
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-white"
            aria-label="Drag to reorder"
          >
            <DragHandleIcon className="w-6 h-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-grow">
            <div className="md:col-span-5">
              <input
                id={`text-${item.id}`}
                type="text"
                value={item.text}
                onChange={(e) =>
                  handleItemChange(item.id, "text", e.target.value)
                }
                placeholder="Link Text"
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white"
                aria-label="Link Text"
              />
            </div>
            <div className="md:col-span-6">
              <select
                id={`url-${item.id}`}
                value={item.url}
                onChange={(e) =>
                  handleItemChange(item.id, "url", e.target.value)
                }
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white"
                aria-label="Link URL"
              >
                <optgroup label="Site Pages">
                  {builtInPages.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Custom Pages">
                  {pages.map((p) => (
                    <option key={p.id} value={p.path}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <button
            onClick={() => deleteItem(item.id)}
            className="ml-auto p-2 bg-red-600/50 text-red-300 rounded-md hover:bg-red-600 hover:text-white transition-colors"
            aria-label="Delete menu item"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">
        Navigation Management
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700 self-start">
          <h2 className="text-xl font-semibold text-white mb-4">Menus</h2>
          <div className="space-y-2">
            {menus.map((menu) => (
              <div
                key={menu.id}
                onClick={() => handleMenuSelection(menu.id)}
                className={`p-3 rounded-md cursor-pointer transition-colors ${selectedMenuId === menu.id ? "bg-sky-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-gray-300"}`}
              >
                {menu.name}
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {currentMenu ? (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">
                Editing "{currentMenu.name}"
              </h2>

              {/* Column Headers */}
              <div className="flex items-center gap-4 px-4 pb-2 mb-2 border-b border-slate-700">
                <div className="w-6 h-6"></div> {/* Spacer for drag handle */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-grow">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-bold text-gray-400">
                      Text
                    </label>
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-sm font-bold text-gray-400">
                      Link
                    </label>
                  </div>
                </div>
                <div className="w-9 h-9"></div> {/* Spacer for delete button */}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentMenu.items}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {currentMenu.items.map((item) => (
                      <SortableMenuItem key={item.id} item={item} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700">
                <button
                  onClick={addNewItem}
                  className="flex items-center text-sky-400 hover:text-sky-300 font-medium"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Menu Item
                </button>
                <button
                  onClick={handleSaveMenu}
                  className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600 transition-all duration-200 ease-in-out"
                >
                  Save Menu
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-center h-full min-h-[20rem]">
              <p className="text-gray-400">Select a menu to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationManagement;
