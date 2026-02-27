// ...existing code...

import React, { useState, useEffect } from "react";
import { useProducts } from "../../context/ProductContext";
import { useGalleries } from "../../context/GalleryContext";
// WARNING: This page uses useGalleries and must be rendered within a GalleryProvider (see App.tsx)
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { Product, ProductOption, ProductOptionList } from "../../types";
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
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


interface SortableOptionListProps {
	optionList: ProductOptionList;
	onChangeName: (value: string) => void;
	onToggleRequired: () => void;
	onDelete: () => void;
	onAddOption: () => void;
	onOptionChange: (
		optionId: string,
		field: "name" | "priceDelta",
		value: string,
	) => void;
	onDeleteOption: (optionId: string) => void;
	onDragEndOption: (event: DragEndEvent) => void;
}

const SortableOptionList: React.FC<SortableOptionListProps> = ({
	optionList,
	onChangeName,
	onToggleRequired,
	onDelete,
	onAddOption,
	onOptionChange,
	onDeleteOption,
	onDragEndOption,
}) => {
	// ...existing code...
};

interface SortableOptionProps {
	option: ProductOption;
	onChangeName: (value: string) => void;
	onChangePriceDelta: (value: string) => void;
	onDelete: () => void;
}

const SortableOption: React.FC<SortableOptionProps> = ({
	option,
	onChangeName,
	onChangePriceDelta,
	onDelete,
}) => {
	// ...existing code...
};

const ProductManagement: React.FC = () => {
	// ...existing code...
};

export default ProductManagement;
