const nodoH = document.getElementById("nodo-status");
const levantar = document.getElementById("levantar");
const refrescar = document.getElementById("refrescar-status");
const mysqldH = document.getElementById("mysqld-status");
const mysqld = document.getElementById("mysqld");

// TODO: Refactorizar index para hacerlo reutilizable

levantar.addEventListener("click", async () => {
    const resultado = await window.api.levantarNodo();

    nodoH.innerText = `Estado de nodo: ${resultado.status.ndbd ? "ENCENDIDO" : "APAGADO"}`;
    mysqldH.innerText = `Estado de MySQL: ${resultado.status.mysql ? "ENCENDIDO" : "APAGADO"}`;

    if (resultado.status.ndbd) levantar.classList.add("apagado");
    else levantar.classList.remove("apagado");

    if (resultado.status.mysql) { 
        mysqld.classList.add("apagado");
        cargarDatos();
    } else mysqld.classList.remove("apagado");
});

refrescar.addEventListener("click", async () => {
    const resultado = await window.api.refrescarStatus();
    nodoH.innerText = `Estado de nodo: ${resultado.status.ndbd ? "ENCENDIDO" : "APAGADO"}`;
    mysqldH.innerText = `Estado de MySQL: ${resultado.status.mysql ? "ENCENDIDO" : "APAGADO"}`;

    if (resultado.status.ndbd) levantar.classList.add("apagado");
    else levantar.classList.remove("apagado");

    if (resultado.status.mysql) { 
        mysqld.classList.add("apagado");
        cargarDatos();
    } else mysqld.classList.remove("apagado");
});

mysqld.addEventListener("click", async () => {
    const resultado = await window.api.conectar-mysqld();
    mysqldH.innerText = `Estado de MySQL: ${!resultado.error ? "ENCENDIDO" : "APAGADO"}`;

    cargarDatos();
});

async function cargarDatos() {
    const resultado = await window.api.obtenerDatos();

    if (resultado.error) {
        console.error("Error al obtener los datos:", resultado.message);
        return;
    }

    const tbody = document.querySelector("#tablaBD tbody");
    tbody.innerHTML = "";

    resultado.data.forEach(dato => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${dato.id}</td>
            <td>${dato.nombre}</td>
            <td>${dato.email}</td>
            <td>${dato.edad}</td>
            <td>
                <button class="editar" data-id="${dato.id}">
                    Editar
                </button>
                <button class="eliminar" data-id="${dato.id}">
                    Eliminar
                </button>
            </td>
        `;

        tbody.appendChild(fila);
    });

    const eliminar = document.querySelectorAll(".eliminar");
    eliminar.forEach(boton => {
        boton.addEventListener("click", async () => {
            const id = boton.getAttribute("data-id");
            await window.api.borrarRow(id);
            cargarDatos();
        });
    });

    const editar = document.querySelectorAll(".editar");

    editar.forEach(boton => {
        boton.addEventListener("click", () => {

            const fila = boton.closest("tr");
            const celdas = fila.querySelectorAll("td");

            const id = boton.getAttribute("data-id");
            const nombreActual = celdas[1].innerText;
            const emailActual = celdas[2].innerText;
            const edadActual = celdas[3].innerText;

            celdas[1].innerHTML = `<input class="edicion-inline" type="text" value="${nombreActual}">`;
            celdas[2].innerHTML = `<input class="edicion-inline" type="email" value="${emailActual}">`;
            celdas[3].innerHTML = `<input class="edicion-inline" type="number" value="${edadActual}">`;

            boton.innerText = "Guardar";
            boton.classList.remove("editar");
            boton.classList.add("guardar");

            boton.addEventListener("click", async () => {

                const nuevoNombre = celdas[1].querySelector("input").value;
                const nuevoEmail = celdas[2].querySelector("input").value;
                const nuevaEdad = Number(celdas[3].querySelector("input").value);

                await window.api.actualizarRow({
                    id,
                    nombre: nuevoNombre,
                    email: nuevoEmail,
                    edad: nuevaEdad
                });

                cargarDatos();
            }, { once: true });

        }, { once: true });
    });

}

insertar.addEventListener("click", async () => {
    const nombre = document.getElementById("input-nombre").value;
    const email = document.getElementById("input-email").value;
    const edad = Number(document.getElementById("input-edad").value);
    const resultado = await window.api.insertarRow({ nombre, email, edad });

    if (!resultado.error) cargarDatos();
    else return;
});

cargarDatos();