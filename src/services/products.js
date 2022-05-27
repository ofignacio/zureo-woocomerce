import fs from "fs";

import {
  getProducts as getProductsWoo,
  batch,
  batchCategory,
  getCategories as getCategoriesW,
  getCategory as getCategoryW,
  createCategory,
  updateCategory,
  createProduct,
  updateProduct,
  uploadFile,
  deleteProduct,
  createTag,
  getTag,
} from "../repositories/woocomerce";
import {
  getProducts as getProductsZureo,
  getImages,
  getCategories as getCategoriesZ,
  getCategory as getCategoryZ,
} from "../repositories/zureo";

let running = false;

const insideCategories = async (category, parent) => {
  if (!category) return;

  const data = {
    name: category.nombre,
    slug: `${category.id}`,
  };

  if (parent) {
    Object.assign(data, { parent });
  }
  let response;
  try {
    response = await createCategory(data);
  } catch (ex) {
    return;
  }

  if (!category.hijos || !response) return;
  for (const hijo of category.hijos) {
    await insideCategories(hijo, response.id);
  }
};

export const sync = async () => {
  if (running) {
    console.log("It's running, cancel request");
    return;
  }
  try {
    // Logs
    running = true;
    console.log("Empezo");

    // Get all categories from Zureo and create in Wordpres
    const categories = await getCategoriesZ({ emp: 1 });
    if (categories && categories.data) {
      for (const category of categories.data) {
        insideCategories(category);
      }
    }

    // Start product variables
    let temporalProducts = [];
    let zuproducts = [];
    let pagePro = 0;

    // Get all products from Zureo
    do {
      const d = await getProductsZureo({ emp: 1, from: pagePro });
      temporalProducts = d.data;
      zuproducts = [...zuproducts, ...temporalProducts];
      pagePro += 1000;
    } while (temporalProducts.length);

    // Start category variables
    let temporalCategories = [];
    let categoriesW = [];
    let pageCat = 1;

    // Get all categories from Wordpres
    do {
      temporalCategories = await getCategoriesW({
        per_page: 100,
        page: pageCat,
      });
      categoriesW = [...categoriesW, ...temporalCategories];
      pageCat++;
    } while (temporalCategories.length);

    // Create an initial counter to log added products
    let counter = 1;

    // Core process
    for (const zproduct of zuproducts) {
      try {
        // Deleted products
        if (zproduct.baja) {
          let productsToDelete;
          if (!zproduct.codigo) {
            productToDelete = await getProductsWoo({ tag: zproduct.id });
          } else {
            productToDelete = await getProductsWoo({ sku: zproduct.codigo });
          }

          let productToDelete =
            productsToDelete && productsToDelete.length
              ? productsToDelete[0]
              : null;

          if (productToDelete) {
            await deleteProduct({ id: productToDelete.id });
          }
        }
        // Start Create/Update products
        else {
          // Get all products from Wordpres that contains the same sku (only one)
          let wproduct = await getProductsWoo({ sku: zproduct.codigo });
          wproduct = wproduct.length ? wproduct[0] : null;

          // Start image variable
          let images = [];

          // If zureo product didn't delete and didn't exist in Wordpres, create it
          if (!zproduct.baja && !wproduct) {
            const cat = categoriesW.find(
              (c) =>
                zproduct.tipo &&
                zproduct.tipo.id &&
                c.slug === `${zproduct.tipo.id}`
            );
            const newTag = await createTag({ name: zproduct.id });
            await createProduct({
              name: zproduct.nombre,
              type: "simple",
              regular_price: `${zproduct.precio * zproduct.impuesto}`,
              description: zproduct.descripcion_larga,
              short_description: zproduct.descripcion_corta,
              sku: zproduct.codigo,
              stock_quantity: zproduct.stock,
              stock_status: zproduct.stock > 0 ? "instock" : "outofstock",
              // images: images.length ? images : null,
              categories: cat ? [{ id: cat.id }] : null,
              tags: [{ id: newTag.id, name: newTag.name }],
            });
          }
          // If product exists, update it
          else if (wproduct) {
            const cat = categoriesW.find(
              (c) =>
                zproduct.tipo &&
                zproduct.tipo.id &&
                c.slug === `${zproduct.tipo.id}`
            );
            const tags = await getTag({ search: zproduct.id });
            let tag = tags && tags.length ? tags[0] : null;
            if (!tag) {
              tag = await createTag({ name: zproduct.id });
            }
            await updateProduct({
              id: wproduct.id,
              name: zproduct.nombre,
              type: "simple",
              regular_price: `${zproduct.precio * zproduct.impuesto}`,
              description: zproduct.descripcion_larga,
              short_description: zproduct.descripcion_corta,
              sku: zproduct.codigo,
              stock_quantity: zproduct.stock,
              stock_status: zproduct.stock > 0 ? "instock" : "outofstock",
              // images: images.length ? images : null,
              categories: cat ? [{ id: cat.id }] : null,
              status: zproduct.baja ? "private" : "publish",
              catalog_visibility: zproduct.baja ? "hidden" : "visible",
              tags: [{ id: tag.id, name: tag.name }],
            });
          }
        }
        // End Create/Update products

        // Log counter and zureo products size
        console.log(`${counter} / ${zuproducts.length}`);
        counter++;
      } catch (error) {
        console.log(`Can't insert ${counter} product`, error);
      }
    }

    //Update products with images
    for (const zproduct of zuproducts.filter((p) => !p.baja)) {
      let wproduct;
      let images = [];

      const zimages = await getImages(zproduct.id);
      if (zimages && zimages.data && zimages.data.length) {
        wproduct = await getProductsWoo({ sku: zproduct.codigo });
        wproduct = wproduct.length ? wproduct[0] : null;
        if (wproduct && wproduct.images && !wproduct.images.length) {
          for (const i of zimages.data) {
            fs.writeFileSync(
              `./${i.filename}`,
              Buffer.from(i.base64, "base64")
            );
            const image = await uploadFile(
              fs.readFileSync(`./${i.filename}`),
              i.filename
            );
            images.push({ src: image.source_url });
            fs.unlinkSync(`./${i.filename}`);
          }

          if (images && images.length) {
            await updateProduct({
              id: wproduct.id,
              images: images.length ? images : null,
            });
          }
        }
      }
    }

    console.log("Termino");
    running = false;
  } catch (ex) {
    running = false;
    console.log("Termino con error", ex);
    return;
  }
};

export const syncList = async (products) => {
  const categories = await getCategoriesZ({ emp: 1 });

  if (categories && categories.data) {
    for (const category of categories.data) {
      insideCategories(category);
    }
  }

  let temporalProducts = [];
  let zuproducts = [];
  let pagePro = 0;

  do {
    const d = await getProductsZureo({ emp: 1, from: pagePro });
    temporalProducts = d.data;
    zuproducts = [...zuproducts, ...temporalProducts];
    pagePro += 1000;
  } while (temporalProducts.length);

  let temporalCategories = [];
  let categoriesW = [];
  let pageCat = 1;

  do {
    temporalCategories = await getCategoriesW({
      per_page: 100,
      page: pageCat,
    });
    categoriesW = [...categoriesW, ...temporalCategories];
    pageCat++;
  } while (temporalCategories.length);

  zuproducts = zuproducts.filter(
    (zproduct) => products.includes(zproduct.codigo) || zproduct.baja
  );

  let counter = 1;

  for (const zproduct of zuproducts) {
    try {
      if (zproduct.baja) {
        let productsToDelete;
        if (!zproduct.codigo) {
          productToDelete = await getProductsWoo({ tag: zproduct.id });
        } else {
          productToDelete = await getProductsWoo({ sku: zproduct.codigo });
        }

        let productToDelete =
          productsToDelete && productsToDelete.length
            ? productsToDelete[0]
            : null;

        if (productToDelete) {
          await deleteProduct({ id: productToDelete.id });
        }
      } else {
        let wproduct = await getProductsWoo({ sku: zproduct.codigo });
        wproduct = wproduct.length ? wproduct[0] : null;
        let images = [];

        const zimages = await getImages(zproduct.id);
        if (zimages && zimages.data && zimages.data.length) {
          for (const i of zimages.data) {
            fs.writeFileSync(
              `./${i.filename}`,
              Buffer.from(i.base64, "base64")
            );
            const image = await uploadFile(
              fs.readFileSync(`./${i.filename}`),
              i.filename
            );
            images.push({ src: image.source_url });
            fs.unlinkSync(`./${i.filename}`);
          }
        }

        if (!zproduct.baja && !wproduct) {
          const cat = categoriesW.find(
            (c) =>
              zproduct.tipo &&
              zproduct.tipo.id &&
              c.slug === `${zproduct.tipo.id}`
          );
          const newTag = await createTag({ name: zproduct.id });
          await createProduct({
            name: zproduct.nombre,
            type: "simple",
            tags: [{ id: newTag.id, name: newTag.name }],
            regular_price: `${zproduct.precio * zproduct.impuesto}`,
            description: zproduct.descripcion_larga,
            short_description: zproduct.descripcion_corta,
            sku: zproduct.codigo,
            stock_quantity: zproduct.stock,
            stock_status: zproduct.stock > 0 ? "instock" : "outofstock",
            images: images.length ? images : null,
            categories: cat ? [{ id: cat.id }] : null,
          });
        } else if (wproduct) {
          const cat = categoriesW.find(
            (c) =>
              zproduct.tipo &&
              zproduct.tipo.id &&
              c.slug === `${zproduct.tipo.id}`
          );
          const tags = await getTag({ search: zproduct.id });
          let tag = tags && tags.length ? tags[0] : null;
          if (!tag) {
            tag = await createTag({ name: zproduct.id });
          }
          await updateProduct({
            id: wproduct.id,
            name: zproduct.nombre,
            type: "simple",
            regular_price: `${zproduct.precio * zproduct.impuesto}`,
            description: zproduct.descripcion_larga,
            short_description: zproduct.descripcion_corta,
            sku: zproduct.codigo,
            stock_quantity: zproduct.stock,
            stock_status: zproduct.stock > 0 ? "instock" : "outofstock",
            images: images.length ? images : null,
            categories: cat ? [{ id: cat.id }] : null,
            status: zproduct.baja ? "private" : "publish",
            catalog_visibility: zproduct.baja ? "hidden" : "visible",
            tags: [{ id: tag.id, name: tag.name }],
          });
        }
      }
      console.log(`${counter} / ${zuproducts.length}`);
      counter++;
    } catch (error) {
      console.log(`Can't insert ${counter} product`, error);
    }
  }
};
