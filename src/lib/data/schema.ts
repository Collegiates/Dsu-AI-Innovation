import { z } from "zod";

/**
 * The package-size units we accept. "oz" is weight, "fl_oz" is liquid volume, "ct" is a count of items,
 * "sheets" is for paper goods. Example: a gallon of milk is sizeValue 1, sizeUnit "gal".
 */
export const SIZE_UNITS = ["oz", "fl_oz", "gal", "lb", "ct", "sheets"] as const;
export const SizeUnitSchema = z.enum(SIZE_UNITS);
export type SizeUnit = z.infer<typeof SizeUnitSchema>;

/**
 * One store the shopper can pick, with its name and address.
 * Detours are optional: null means "not measured", and the app never shows or treats it as 0.
 * Example: { id: "aldi-dover", name: "ALDI Dover", detourMinutes: null, detourMiles: null }.
 */
export const StoreSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chain: z.string().min(1),
  address: z.string().min(1),
  onRouteLabel: z.string().min(1),
  detourMinutes: z.number().finite().nonnegative().nullable(),
  detourMiles: z.number().finite().nonnegative().nullable(),
});
export type Store = z.infer<typeof StoreSchema>;

/**
 * One product on one store's shelf, with the price shown on that store's website.
 * Products with the same groupKey and the same variant are interchangeable (e.g. two brands of 2% milk, 1 gal).
 * Example: { brand: "Great Value", name: "2% Reduced Fat Milk", sizeValue: 1, sizeUnit: "gal", price: 3.46 }.
 */
export const ProductSchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  brand: z.string().min(1),
  name: z.string().min(1),
  sizeValue: z.number().finite().positive(),
  sizeUnit: SizeUnitSchema,
  price: z.number().finite().positive(),
  salePrice: z.number().finite().positive().optional(),
  category: z.string().min(1),
  variant: z.string().min(1),
  groupKey: z.string().min(1),
  isStoreBrand: z.boolean(),
  productUrl: z.url().optional(),
  // Number of laundry loads, only for detergents where the label lists it. Lets detergents be compared per load.
  loads: z.number().int().positive().optional(),
  // How the price was checked, from price-audit.csv (e.g. "RETAILER_ONLINE_PRICE__DOVER_NOT_CONFIRMED").
  verification: z.string().min(1),
  collectedAt: z.iso.date(),
});
export type Product = z.infer<typeof ProductSchema>;

export const StoresFileSchema = z.array(StoreSchema);
export const ProductsFileSchema = z.array(ProductSchema);
