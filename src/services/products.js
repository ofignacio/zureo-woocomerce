import fs from 'fs';

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
} from '../repositories/woocomerce';
import {
  getProducts as getProductsZureo,
  getImages,
  getCategories as getCategoriesZ,
  getCategory as getCategoryZ,
} from '../repositories/zureo';

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
  if (running) return;
  try {
    running = true;
    console.log('Empezo');
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

    let counter = 1;

    //Create or update products
    for (const zproduct of zuproducts) {
      try {
        if (zproduct.baja && !zproduct.codigo) {
          let productsToDelete = await getProductsWoo({ tag: zproduct.id });

          let productToDelete = productsToDelete.length
            ? productsToDelete[0]
            : null;

          if (productToDelete) {
            await deleteProduct({ id: productToDelete.id });
          }
        } else {
          let wproduct = await getProductsWoo({ sku: zproduct.codigo });
          wproduct = wproduct.length ? wproduct[0] : null;
          let images = [];

          if (!zproduct.baja && !wproduct) {
            const cat = categoriesW.find(
              (c) =>
                zproduct.tipo &&
                zproduct.tipo.id &&
                c.slug === `${zproduct.tipo.id}`
            );
            const { data: tag } = await createTag({ name: zproduct.id });
            await createProduct({
              name: zproduct.nombre,
              type: 'simple',
              regular_price: `${zproduct.precio * zproduct.impuesto}`,
              description: zproduct.descripcion_larga,
              short_description: zproduct.descripcion_corta,
              sku: zproduct.codigo,
              stock_quantity: zproduct.stock,
              stock_status: zproduct.stock > 0 ? 'instock' : 'outofstock',
              images: images.length ? images : null,
              categories: cat ? [{ id: cat.id }] : null,
              tags: [{ id: tag.id, name: tag.name }],
            });
          } else if (wproduct) {
            const cat = categoriesW.find(
              (c) =>
                zproduct.tipo &&
                zproduct.tipo.id &&
                c.slug === `${zproduct.tipo.id}`
            );
            await updateProduct({
              id: wproduct.id,
              name: zproduct.nombre,
              type: 'simple',
              regular_price: `${zproduct.precio * zproduct.impuesto}`,
              description: zproduct.descripcion_larga,
              short_description: zproduct.descripcion_corta,
              sku: zproduct.codigo,
              stock_quantity: zproduct.stock,
              stock_status: zproduct.stock > 0 ? 'instock' : 'outofstock',
              // images: images.length ? images : null,
              categories: cat ? [{ id: cat.id }] : null,
              status: zproduct.baja ? 'private' : 'publish',
              catalog_visibility: zproduct.baja ? 'hidden' : 'visible',
            });
          }
        }
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
        for (const i of zimages.data) {
          fs.writeFileSync(`./${i.filename}`, Buffer.from(i.base64, 'base64'));
          const image = await uploadFile(
            fs.readFileSync(`./${i.filename}`),
            i.filename
          );
          images.push({ src: image.source_url });
          fs.unlinkSync(`./${i.filename}`);
        }

        if (images && images.length && wproduct) {
          await updateProduct({
            id: wproduct.id,
            images: images.length ? images : null,
          });
        }
      }
    }
    console.log('Termino');
    running = false;
  } catch (ex) {
    running = false;
    console.log('Termino con error', ex);
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
      if (zproduct.baja && !zproduct.codigo) {
        let productsToDelete = await getProductsWoo({ tag: zproduct.id });

        let productToDelete = productsToDelete.length
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
              Buffer.from(i.base64, 'base64')
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
          const { data: tag } = await createTag({ name: zproduct.id });
          await createProduct({
            name: zproduct.nombre,
            type: 'simple',
            tags: [{ id: tag.id, name: tag.name }],
            regular_price: `${zproduct.precio * zproduct.impuesto}`,
            description: zproduct.descripcion_larga,
            short_description: zproduct.descripcion_corta,
            sku: zproduct.codigo,
            stock_quantity: zproduct.stock,
            stock_status: zproduct.stock > 0 ? 'instock' : 'outofstock',
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
          await updateProduct({
            id: wproduct.id,
            name: zproduct.nombre,
            type: 'simple',
            regular_price: `${zproduct.precio * zproduct.impuesto}`,
            description: zproduct.descripcion_larga,
            short_description: zproduct.descripcion_corta,
            sku: zproduct.codigo,
            stock_quantity: zproduct.stock,
            stock_status: zproduct.stock > 0 ? 'instock' : 'outofstock',
            images: images.length ? images : null,
            categories: cat ? [{ id: cat.id }] : null,
            status: zproduct.baja ? 'private' : 'publish',
            catalog_visibility: zproduct.baja ? 'hidden' : 'visible',
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
