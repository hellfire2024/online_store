import React from "react";
import { Menu, MenuItem, Page } from "../../types";
import { PlusIcon, TrashIcon } from "../Icons";
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

const builtInPages = [
  { title: "Home", path: "/" },
  { title: "Store", path: "/store" },
  { title: "About", path: "/about" },
  { title: "Contact", path: "/contact" },
  { title: "Cart", path: "/cart" },
  { title: "Login", path: "/login" },
];

interface SortableMenuItemProps {
  item: MenuItem;
  onItemChange: (itemId: string, field: "text" | "url", value: string) => void;
  onDeleteItem: (itemId: string) => void;
  pages: Page[];
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({
  item,
  onItemChange,
  onDeleteItem,
  pages,
}) => {
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
      className={`p-4 bg-slate-700 rounded-md border border-slate-600 ${isDragging ? "ring-2 ring-sky-500" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-white"
        >
          <DragHandleIcon className="w-6 h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-grow">
          <div className="md:col-span-5">
            <input
              type="text"
              value={item.text}
              onChange={(e) => onItemChange(item.id, "text", e.target.value)}
              className="w-full p-2 bg-slate-600 rounded-md"
              aria-label="Link Text"
            />
          </div>
          <div className="md:col-span-6">
            <select
              value={item.url}
              onChange={(e) => onItemChange(item.id, "url", e.target.value)}
              className="w-full p-2 bg-slate-600 rounded-md"
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
          onClick={() => onDeleteItem(item.id)}
          className="ml-auto p-2 text-red-400 hover:text-red-300"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

interface MenuEditorProps {
  menus: Menu[];
  pages: Page[];
  selectedMenuId: string | null;
  currentMenu: Menu | null;
  handleMenuSelection: (id: string) => void;
  handleMenuItemChange: (
    itemId: string,
    field: "text" | "url",
    value: string,
  ) => void;
  deleteMenuItem: (id: string) => void;
  addMenuItem: () => void;
  handleSaveMenu: () => void;
  hasMenuUnsavedChanges: boolean;
}

const MenuEditor: React.FC<MenuEditorProps> = ({
  menus,
  pages,
  selectedMenuId,
  currentMenu,
  handleMenuSelection,
  handleMenuItemChange,
  deleteMenuItem,
  addMenuItem,
  handleSaveMenu,
  hasMenuUnsavedChanges,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (currentMenu && over && active.id !== over.id) {
      const oldIndex = currentMenu.items.findIndex(
        (item) => item.id === active.id,
      );
      const newIndex = currentMenu.items.findIndex(
        (item) => item.id === over.id,
      );
      const newItems = arrayMove(currentMenu.items, oldIndex, newIndex);
      // This needs to be handled by the parent component's state update logic
      // For now, we'll just log it. A proper implementation would pass this up.
      console.log("New order:", newItems);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-slate-900 p-4 rounded-lg self-start">
        <h2 className="text-xl font-semibold text-white mb-4">
          Available Menus
        </h2>
        <div className="space-y-2">
          {menus.map((menu) => (
            <div
              key={menu.id}
              onClick={() => handleMenuSelection(menu.id)}
              className={`p-3 rounded-md cursor-pointer ${selectedMenuId === menu.id ? "bg-sky-600" : "bg-slate-700"}`}
            >
              {menu.name}
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2">
        {currentMenu ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                Editing "{currentMenu.name}"
              </h2>
              <button
                onClick={handleSaveMenu}
                className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600 disabled:opacity-50"
                disabled={!hasMenuUnsavedChanges}
              >
                Save Menu
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentMenu.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {currentMenu.items.map((item: MenuItem) => (
                    <SortableMenuItem
                      key={item.id}
                      item={item}
                      onItemChange={handleMenuItemChange}
                      onDeleteItem={deleteMenuItem}
                      pages={pages}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button
              onClick={addMenuItem}
              className="mt-4 flex items-center text-sky-400 hover:text-sky-300"
            >
              <PlusIcon className="w-5 h-5 mr-2" /> Add Menu Item
            </button>
          </div>
        ) : (
          <p className="text-gray-400">Select a menu to begin editing.</p>
        )}
      </div>
    </div>
  );
};

export default MenuEditor;
