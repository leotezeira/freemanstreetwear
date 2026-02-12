export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

export const parsePrice = (price: string | number): number => {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(/[^0-9.-]+/g, ''));
};

export const getShippingCost = (): number => {
  return parseFloat(process.env.FLAT_RATE_SHIPPING || '1000') / 100;
};
