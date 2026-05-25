/**
 * Formatea un número como moneda CLP de Chile.
 * El CLP no utiliza decimales y usa punto como separador de miles.
 * @param {number} amount - El monto a formatear
 * @returns {string} - El monto formateado
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$ 0';
  }
  
  // Usamos el locale de Chile para el formato estándar
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default formatCurrency;
