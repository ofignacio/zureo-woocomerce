import { fetchW, fetchWFile } from '../utils/api';

export const getProducts = async (params) => {
  const products = await fetchW('/wp-json/wc/v3/products', {
    method: 'GET',
    params,
  });

  return products;
};

export const batch = async (params) => {
  return await fetchW('/wp-json/wc/v3/products/batch', {
    method: 'POST',
    params,
  });
};

export const batchCategory = async (params) => {
  return await fetchW('/wp-json/wc/v3/products/categories/batch', {
    method: 'POST',
    params,
  });
};

export const createTag = async (params) => {
  return await fetchW('/wp-json/wc/v3/products/tags', {
    method: 'POST',
    params,
  });
};

export const getTag = async (params) => {
  return await fetchW('/wp-json/wc/v3/products/tags', {
    method: 'GET',
    params,
  });
};

export const createProduct = async (params) => {
  return await fetchW('/wp-json/wc/v3/products', {
    method: 'POST',
    params,
  });
};


export const updateProduct = async (params) => {
  return await fetchW(`/wp-json/wc/v3/products/${params.id}`, {
    method: 'PUT',
    params,
  });
};

export const deleteProduct = async (params) => {
  return await fetchW(`/wp-json/wc/v3/products/${params.id}`, {
    method: 'DELETE',
    params,
  });
};

export const uploadFile = async (file, filename) => {
  return await fetchWFile('/wp-json/wp/v2/media', {
    file,
    filename,
  });
};

export const createCategory = async (params) => {
  return await fetchW('/wp-json/wc/v3/products/categories', {
    method: 'POST',
    params,
  });
};

export const updateCategory = async (id, params) => {
  return await fetchW(`/wp-json/wc/v3/products/categories/${id}`, {
    method: 'PUT',
    params,
  });
};

export const getCategory = async (id) => {
  return await fetchW(`/wp-json/wc/v3/products/categories/${id}`, {
    method: 'GET',
  });
};

export const getCategories = async (params) => {
  return await fetchW(`/wp-json/wc/v3/products/categories`, {
    method: 'GET',
    params,
  });
};
