import React, { useState, useEffect } from 'react';
import { getConfiguracion, updateConfiguracion, importarInventario } from '../services/api';
import * as XLSX from 'xlsx';

const Configuraciones = () => {
  const [config, setConfig] = useState({
    SUPERMERCADO_NOMBRE: '',
    SUPERMERCADO_DIRECCION: '',
    SUPERMERCADO_TELEFONO: '',
    SUPERMERCADO_EMAIL: '',
    IVA_PORCENTAJE: '',
    MONEDA: '',
    SUPERMERCADO_LOGO: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await getConfiguracion();
      setConfig(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      console.error('Error al cargar configuración', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, SUPERMERCADO_LOGO: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfiguracion(config);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      alert('Error al guardar configuración');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nombre: 'Ejemplo Producto', Descripcion: 'Descripción opcional', Precio: 15.50, Stock: 100 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingreso de Inventario');
    XLSX.writeFile(wb, 'Plantilla_Inventario.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('El archivo Excel está vacío.');
          return;
        }

        const res = await importarInventario(data);
        alert(`¡Éxito! Productos insertados: ${res.data.agregados}. Productos actualizados: ${res.data.actualizados}`);
      } catch (error) {
        console.error('Error importando:', error);
        alert('Ocurrió un error al procesar el archivo Excel. Asegúrate de usar la plantilla.');
      } finally {
        setImporting(false);
        e.target.value = null; // reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Configuración General</h1>
        <p className="text-gray-600 mt-1">Ajusta los datos del negocio y opciones de cotización</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Logo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo del Supermercado</label>
              <div className="flex items-center space-x-6">
                {config.SUPERMERCADO_LOGO ? (
                  <div className="relative">
                    <img src={config.SUPERMERCADO_LOGO} alt="Logo Preview" className="h-24 w-auto object-contain border border-gray-200 p-1 rounded bg-gray-50" />
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, SUPERMERCADO_LOGO: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-32 bg-gray-100 flex items-center justify-center rounded border-2 border-dashed border-gray-300">
                    <span className="text-gray-400 text-sm">Sin Logo</span>
                  </div>
                )}
                <div>
                  <label className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    Seleccionar imagen
                    <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Formatos recomendados: PNG, JPG, JPEG (Max 2MB para evitar PDFs muy pesados).</p>
                </div>
              </div>
            </div>

            {/* Campos de texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Supermercado</label>
              <input
                type="text"
                name="SUPERMERCADO_NOMBRE"
                value={config.SUPERMERCADO_NOMBRE}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                name="SUPERMERCADO_DIRECCION"
                value={config.SUPERMERCADO_DIRECCION}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                name="SUPERMERCADO_TELEFONO"
                value={config.SUPERMERCADO_TELEFONO}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                name="SUPERMERCADO_EMAIL"
                value={config.SUPERMERCADO_EMAIL}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda (Ej: MXN, USD)</label>
              <input
                type="text"
                name="MONEDA"
                value={config.MONEDA}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA Porcentaje (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="IVA_PORCENTAJE"
                value={config.IVA_PORCENTAJE}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Migración e Importación de Inventario</h2>
        <p className="text-gray-600 mb-6">Sube tu inventario existente desde un archivo de Excel para no ingresarlo manualmente.</p>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-2">1. Descarga la plantilla</h3>
            <p className="text-sm text-blue-600 mb-4">Utiliza nuestro formato oficial de Excel para garantizar que el sistema asimile tus datos correctamente.</p>
            <button
              onClick={handleDownloadTemplate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              📥 Descargar Plantilla (.xlsx)
            </button>
          </div>

          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-green-800 mb-2">2. Sube tu inventario</h3>
            <p className="text-sm text-green-600 mb-4">Si una fila tiene un nombre existente, se actualizará su precio y se sumará el stock.</p>
            
            <label className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 cursor-pointer'}`}>
              {importing ? 'Procesando archivo...' : '⬆️ Cargar Excel Terminado'}
              <input type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} disabled={importing} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuraciones;
