const { exec, spawn } = require('child_process');
const { BrowserWindow, app, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let ven;

function crearVentana() {
    ven = new BrowserWindow({
        width: 1200,
        height: 1000,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    ven.loadFile(path.join(__dirname, "/interfaces/index.html"));
}

app.whenReady().then(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Base de datos conectada ...");
        connection.release();
    } catch {
        console.error("No se encontró base de datos a la cual apuntar ...");
    }

    crearVentana();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            crearVentana();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Variables de uso medido

const NDBD_PATH = "ndbd.exe";
const NDBD_ARGS = ["--ndb-connectstring=127.0.0.1:1186"];
const NDBD_CWD = "C:/mysql-cluster/bin";

const procesos = {
    ndbd: null,
};

const status = {
    ndbd: false,
    mysql: false
};

let data = "";

// Metodo para ejecutar comando de conexion de nodo de datos

ipcMain.handle("levantar-ndbd", async () => {
    return new Promise((resolve) => {

        if (procesos.ndbd) {
            return resolve({
                error: false,
                status,
                message: "El nodo ya está corriendo"
            });
        }

        data = "";
        status.ndbd = false;

        procesos.ndbd = spawn(NDBD_PATH, NDBD_ARGS, {
            cwd: NDBD_CWD
        });

        procesos.ndbd.stdout.on("data", (chunk) => {
            const output = chunk.toString();
            data += output;
            console.log(output);

            if (output.includes("allocated") && !output.includes("ERROR")) {
                status.ndbd = true;
            }
        });

        procesos.ndbd.stderr.on("data", (chunk) => {
            const output = chunk.toString();
            data += output;
            console.error(output);

            if (output.includes("ERROR")) {
                status.ndbd = false;
            }
        });

        procesos.ndbd.on("exit", (code) => {
            console.log("ndbd terminó con código:", code);
            status.ndbd = false;
            procesos.ndbd = null;
        });

        // Esperamos 2 segundos para evaluar estado inicial
        setTimeout(async () => {

            try {
                await pool.query("SELECT 1");
                status.mysql = true;
            } catch {
                status.mysql = false;
            }

            resolve({
                error: false,
                status,
                output: data
            });

        }, 2000);
    });
});

// Metodo para refrescar el status del nodo y mysql

async function refrescar() {
    return new Promise(async (resolve) => {
        // Si el proceso ndbd ya está corriendo, usamos su output
        const output = data || "";

        status.ndbd = output.includes("allocated") && !output.includes("ERROR");

        try {
            await pool.query("SELECT 1");
            status.mysql = true;
        } catch {
            status.mysql = false;
        }

        resolve({
            output,
            status
        });
    });
}

ipcMain.handle("refrescar-status", async () => {

    // Validar si el proceso sigue vivo
    if (!procesos.ndbd || procesos.ndbd.killed) {
        status.ndbd = false;
    }

    // Validar MySQL
    try {
        await pool.query("SELECT 1");
        status.mysql = true;
    } catch {
        status.mysql = false;
    }

    return {
        status,
        output: data
    };
});

// Obtener datos de la base de datos

ipcMain.handle("obtener-datos", async () => {
    try {
        const [rows] = await pool.query("SELECT * FROM usuarios");
        return { error: false, data: rows };
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// Borrar ROW de la base de datos

ipcMain.handle("borrar-row", async (event, id) => {
    try {
        await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
        return { error: false };
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// Insertar ROW en la base de datos

ipcMain.handle("insertar-row", async (event, data) => {
    const { nombre, email, edad } = data;
    try {
        await pool.query("INSERT INTO usuarios (nombre, email, edad) VALUES (?, ?, ?)", [nombre, email, edad]);
        return { error: false };
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// Edicion inline de la ROW

ipcMain.handle("actualizar-row", async (event, data) => {
    const { id, nombre, email, edad } = data;
    try {
        await pool.query("UPDATE usuarios SET nombre = ?, email = ?, edad = ? WHERE id = ?", [nombre, email, edad, id]);
        return { error: false };
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// Conectar mysql

ipcMain.handle("conectar-mysql", async () => {
    try {
        const [rows] = await pool.query("SELECT * FROM usuarios");
        return { error: false, data: rows };
    } catch (error) {
        return { error: true, message: error.message };
    }
});

// ! FINAL DE CODIGO

// Matar procesos de consola al cerrar programa

app.on("before-quit", () => {
    console.log("Cerrando procesos del nodo...");

    if (procesos.ndbd) {
        procesos.ndbd.kill();
    }
});