const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    insertarRow: (data) => ipcRenderer.invoke("insertar-row", data),
    obtenerDatos: () => ipcRenderer.invoke("obtener-datos"),
    borrarRow: (id) => ipcRenderer.invoke("borrar-row", id),
    actualizarRow: (id, data) => ipcRenderer.invoke("actualizar-row", id, data),
    refrescarStatus: () => ipcRenderer.invoke("refrescar-status"),
    levantarNodo: () => ipcRenderer.invoke("levantar-ndbd"),
    conectarMysqld: () => ipcRenderer.invoke("conectar-mysqld"),
});