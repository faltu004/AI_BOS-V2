import { motion } from "framer-motion";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Edit3,
  Filter,
  Image,
  Layers3,
  Package,
  Plus,
  Search,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import { productCategories, seedProducts, suppliers } from "./products.data";
import type { Product, ProductFormInput } from "./products.types";
import {
  createProductFromInput,
  formatMoney,
  generateSku,
  getProductStats,
  getProductStatus,
  statusClass,
} from "./products.utils";

const emptyForm: ProductFormInput = {
  productName: "",
  category: productCategories[0],
  price: 0,
  costPrice: 0,
  stock: 0,
  supplier: suppliers[0],
  barcode: "",
  images: [],
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProductFormModal({
  initialProduct,
  onClose,
  onSubmit,
  sku,
}: {
  initialProduct?: Product | null;
  onClose: () => void;
  onSubmit: (input: ProductFormInput) => void;
  sku: string;
}) {
  const [form, setForm] = useState<ProductFormInput>(() =>
    initialProduct
      ? {
          productName: initialProduct.productName,
          sku: initialProduct.sku,
          category: initialProduct.category,
          price: initialProduct.price,
          costPrice: initialProduct.costPrice,
          stock: initialProduct.stock,
          supplier: initialProduct.supplier,
          barcode: initialProduct.barcode,
          images: initialProduct.images,
        }
      : { ...emptyForm, sku },
  );

  const updateField = <K extends keyof ProductFormInput>(field: K, value: ProductFormInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.form
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background p-5 shadow-glass"
        initial={{ opacity: 0, scale: 0.96 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{initialProduct ? "Edit Product" : "Add Product"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">SKU: {form.sku}</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline">
            Close
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input id="productName" required value={form.productName} onChange={(event) => updateField("productName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={form.sku} onChange={(event) => updateField("sku", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {productCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.supplier} onChange={(event) => updateField("supplier", event.target.value)}>
              {suppliers.map((supplier) => (
                <option key={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" min={0} type="number" value={form.price} onChange={(event) => updateField("price", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price</Label>
            <Input id="costPrice" min={0} type="number" value={form.costPrice} onChange={(event) => updateField("costPrice", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" min={0} type="number" value={form.stock} onChange={(event) => updateField("stock", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" value={form.barcode} onChange={(event) => updateField("barcode", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="images">Images</Label>
            <Input
              id="images"
              placeholder="Image labels or filenames, comma separated"
              value={form.images.join(", ")}
              onChange={(event) => updateField("images", parseList(event.target.value))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">{initialProduct ? "Save Product" : "Add Product"}</Button>
        </div>
      </motion.form>
    </div>
  );
}

function ProductCard({
  onDelete,
  onEdit,
  product,
}: {
  onDelete: () => void;
  onEdit: () => void;
  product: Product;
}) {
  const status = getProductStatus(product.stock);
  const margin = product.price > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : 0;

  return (
    <Card className="h-full bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-sm font-bold text-primary">
            {product.images[0] ?? <Image className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">{product.sku}</p>
            <h3 className="mt-1 line-clamp-2 font-semibold leading-6">{product.productName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(status))}>{status}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{product.supplier}</span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Metric label="Price" value={formatMoney(product.price)} />
          <Metric label="Cost" value={formatMoney(product.costPrice)} />
          <Metric label="Margin" value={`${margin}%`} />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Inventory</span>
            <span className="font-semibold">{product.stock} units</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, product.stock)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
          <Barcode className="h-4 w-4 text-primary" />
          <span className="truncate">{product.barcode}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button onClick={onDelete} size="sm" type="button" variant="outline">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/65 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

export function ProductsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [products, setProducts] = useState(seedProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const stats = getProductStats(products);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const searchText = `${product.productName} ${product.sku} ${product.category} ${product.supplier} ${product.barcode}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((product) => category === "All" || product.category === category)
      .filter((product) => stockFilter === "All" || getProductStatus(product.stock) === stockFilter);
  }, [category, products, search, stockFilter]);

  const lowStockProducts = products.filter((product) => getProductStatus(product.stock) !== "In Stock");

  const upsertProduct = (input: ProductFormInput) => {
    if (editingProduct) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                ...input,
                sku: input.sku || product.sku,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : product,
        ),
      );
    } else {
      setProducts((current) => [createProductFromInput(input, current), ...current]);
    }
    setEditingProduct(null);
    setIsAddingProduct(false);
  };

  const deleteProduct = async (id: string) => {
    const accepted = await confirm({
      title: "Delete product?",
      description: "This product will be removed from the inventory view.",
      confirmLabel: "Delete Product",
      tone: "danger",
    });
    if (accepted) {
      setProducts((current) => current.filter((item) => item.id !== id));
      toast({ title: "Product deleted", description: "The product was removed from inventory.", type: "warning" });
    }
  };

  const statCards = [
    { label: "Total Products", value: stats.total, icon: Package },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle },
    { label: "Out of Stock", value: stats.outOfStock, icon: Warehouse },
    { label: "Inventory Value", value: formatMoney(stats.inventoryValue), icon: Boxes },
  ];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Products</p>
            <h1 className="text-2xl font-bold">Product Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
            <Button onClick={() => setIsAddingProduct(true)} type="button">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass h-full">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search products, SKU, supplier, barcode..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All</option>
                {productCategories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option>All</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {productCategories.map((item) => (
                <button
                  className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  {item}
                </button>
              ))}
              <button
                className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                onClick={() => setStockFilter("Low Stock")}
                type="button"
              >
                <Filter className="h-3.5 w-3.5" />
                Low Stock Alert
              </button>
            </div>
          </CardContent>
        </Card>

        {lowStockProducts.length > 0 && (
          <Card className="glass border-amber-400/35">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lowStockProducts.map((product) => (
                <div className="rounded-lg border bg-background/65 p-4" key={product.id}>
                  <p className="font-semibold">{product.productName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.sku} - {product.stock} units
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="lg:col-span-2 2xl:col-span-3">
              <EmptyState
                action={{ label: "Add Product", onClick: () => setIsAddingProduct(true) }}
                description="No products match the current search and inventory filters."
                icon={Package}
                title="No products found"
              />
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                onDelete={() => deleteProduct(product.id)}
                onEdit={() => setEditingProduct(product)}
                product={product}
              />
            ))
          )}
        </div>

        <Card className="glass overflow-hidden">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getProductStatus(product.stock);
                  return (
                    <tr className="border-b" key={product.id}>
                      <td className="p-4 font-semibold">{product.productName}</td>
                      <td className="p-4 text-primary">{product.sku}</td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4">{product.supplier}</td>
                      <td className="p-4">{formatMoney(product.price)}</td>
                      <td className="p-4">{product.stock}</td>
                      <td className="p-4">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(status))}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {(isAddingProduct || editingProduct) && (
        <ProductFormModal
          initialProduct={editingProduct}
          onClose={() => {
            setIsAddingProduct(false);
            setEditingProduct(null);
          }}
          onSubmit={upsertProduct}
          sku={generateSku(products)}
        />
      )}
    </main>
  );
}
