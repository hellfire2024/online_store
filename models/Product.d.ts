interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    inventory: number;
    lowStockThreshold?: number;
    customizable: boolean;
    enableAIIdeas?: boolean;
    galleryId?: string;
    allowCustomImageUpload?: boolean;
    customImageUploadPrice?: number;
    optionLists?: ProductOptionList[];
}
interface ProductOptionList {
    id: string;
    name: string;
    required: boolean;
    order: number;
    options: ProductOption[];
}
interface ProductOption {
    id: string;
    name: string;
    priceDelta: number;
    order: number;
}
export declare function findAll(): Promise<Product[]>;
export declare function findById(id: string): Promise<Product | null>;
export declare function create(data: Partial<Product>): Promise<Product>;
export declare function update(id: string, data: Partial<Product>): Promise<Product | null>;
export declare function remove(id: string): Promise<boolean>;
export {};
//# sourceMappingURL=Product.d.ts.map