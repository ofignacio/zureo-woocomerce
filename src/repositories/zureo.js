import { fetchZ } from '../utils/api';

export const getProducts = async (params) => {
  const products = await fetchZ('/sdk/v1/product/all', {
    method: 'GET',
    params,
  });

  return products;
};

export const getImages = async (id) => {
  const images = await fetchZ('/sdk/v1/product/image', {
    method: 'GET',
    params: {
      id,
    },
  });

  return images;
};

export const getCategories = async (params) => {
  const categories = await fetchZ('/sdk/v1/product_type/all', {
    method: 'GET',
    params,
  });

  return categories;
};

export const getCategory = async (id) => {
  const category = await fetchZ('/sdk/v1/product_type/get', {
    method: 'GET',
    params: {
      id,
    },
  });

  return category;
};
