let idState = 0;

$(document).ready(function () {
    let resultado = $('#resultado');
    $('#btn-generar').on('click',function () {
        const regexp = $('#regexp').val().trim();
        if (!regexp) {
            alert('Por favor ingresa una expresión regular');
            return;
        }
        //Hacer todo: Llama a las funciones para construir el AFN y convertirlo a AFD
        // const results = thompsonToAFD(regexp);
        // mostrarResultado(results);
        $('#resultado').html(`Todavía no hace nada este botón, pero debería hacer los tres pasos seguidos xd`);
    });
    /* Al dar click al botón con id="btn-parsear" */
    $('#btn-parsear').on('click', function(){
        const regexp = $('#regexp').val().trim(); // Tomar la expresión regular que ingreso el usuario
        if (!regexp) {
            alert('Por favor ingresa una expresión regular válida');
            return;
        }
        
        try {
            const [parsedTree] = parse(regexp+"$", 0); // construir el árbol pareado. Se agrega '$' a la regexp para indicar el final y se pasa la posición inicial '0'
            const treeHtml = renderTree(parsedTree); // Construir una árbol en formato de lista para mostrarlo al usuario.
            $('#resultado').empty(); // Limpiar la sección de resultado por si había algo anteriormente
            $('#resultado').html(`<ul>${treeHtml}</ul>`); // Agregar el árbol a la sección de resultados
            console.log('Parseo: '+ JSON.stringify(parsedTree)); // Mostrar el arreglo que regresa la función parse() en la consola
            $('#resultado').append('Parseo completado con éxito');
            $('#resultado').append(JSON.stringify(parsedTree)); // el arreglo también se muestra en la sección de resultados
        } catch (e) { // Si hay un error en el bloque try el error se muestra en consola y en la sección de resultados
            console.error(e);
            $('#resultado').empty();
            $('#resultado').text('Error durante el parseo: ' + e.message);
        }
    });
    $('#btn-afnd').on('click', function(){
        idState = 0;
        const regexp = $('#regexp').val().trim();
        if (!regexp) {
            alert('Por favor ingresa una expresión regular válida');
            return;
        }
        
        try {
            const afnd = thompson(regexp);
            if (!afnd) {
                throw new Error('El autómata generado no existe.');
            } else if (!afnd.inicial) {
                throw new Error('El autómata generado no tiene estado inicial.');
            } else if (!afnd.final){
                throw new Error('El autómata generado no tiene estado final.');
            } else{
                console.log('Autómata generado correctamente.');
            }
            /*
                const seen = new WeakSet();
                const serializedAFND = JSON.stringify(afnd, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return; // Evita referencias circulares
                        }
                        seen.add(value);
                    }
                    return value;
                });
                // console.log('Serialized AFND:', serializedAFND);
                $('#resultado').html(`<p>${serializedAFND}</p>`);

                // Comienza desde el estado inicial del AFND
                // if (afnd && afnd.inicial) {
                //     const seen = new WeakSet();
                //     $('#resultado').append("Información del AFND a partir del estado inicial:<br>");
                //     $('#resultado').append(`Estado inicial: ${afnd.inicial.id}<br>Estado final ${afnd.final.id}<br>`);
                //     imprimirEstado(afnd.inicial, seen);
                //     // $('#resultado').append(`<pre>${imprimirEstado(afnd.inicial, seen)}</pre>`);
                // } else {
                //     console.error("El AFND no tiene un estado inicial definido.");
                // }

                // console.log('Visualize AFND: <br>'+ visualizeAFND(afnd));
                // $('#resultado').append('Autómata Finito No Determinista');
                // $('#resultado').append(JSON.stringify(afnd));
            */
            


            const afndVisualization = visualizeAFND(afnd);
            $('#resultado').append(`<br><pre>${afndVisualization}</pre><hr><strong>Epsilon Closure</strong>`);
            try {
                const afd = convertirAFNDaAFD(afnd);
                // $('#resultado').append(afd);
                // console.log(afd);
                $('#resultado').append("AFD generado:");
                Object.entries(afd).forEach(([estadoId, estado]) => {
                    $('#resultado').append(`<br>Estado ${estadoId}:`);
                    $('#resultado').append(`<br>\u2003Closure: [${estado.closure.map(e => e.id).join(", ")}]`);
                    $('#resultado').append(`<br>\u2003Transiciones:`);
                    Object.entries(estado.transitions).forEach(([letra, destino]) => {
                        $('#resultado').append(`<br>\u2003\u2003Con '${letra}' -> Estado ${destino}`);
                    });
                    $('#resultado').append(`<br>\u2003Final: ${estado.final ? "Sí" : "No"}`);
                });
                // console.log(procesarAFND(afnd));
            } catch (e) {
                $('#resultado').append(`Error: epsClosure(afnd); ${e.message}`);
            }

        } catch (e) {
            console.error(e);
            $('#resultado').empty();
            $('#resultado').text('Error al construir AFND: ' + e.message);
        }
    });
});

function convertirAFNDaAFD(afnd) {
    const alfabeto = new Set(); // Alfabeto del AFND
    const afd = {}; // Representación del AFD
    const procesados = new Map(); // Map para asociar clausuras con IDs
    const pendientes = []; // Clausuras pendientes de procesar
    let idEstado = 0; // Contador de estados del AFD

    // Clausura inicial del AFND
    const closureInicial = epsClosure(afnd.inicial);
    const inicialId = idEstado++;
    procesados.set(closureInicial.map(e => e.id).sort().join(','), {
        id: inicialId,
        closure: closureInicial,
    });
    pendientes.push(closureInicial);

    while (pendientes.length > 0) {
        const actualClosure = pendientes.shift(); // Procesar la siguiente clausura
        const actualId = procesados.get(actualClosure.map(e => e.id).sort().join(',')).id;

        afd[actualId] = { transitions: {}, closure: actualClosure };

        actualClosure.forEach((estado) => {
            Object.keys(estado.transitions).forEach((letra) => {
                alfabeto.add(letra); // Registrar el alfabeto dinámicamente

                const nuevosEstados = [];
                estado.transitions[letra].forEach((destino) => {
                    nuevosEstados.push(...epsClosure(destino));
                });

                const nuevaClausura = Array.from(new Set(nuevosEstados)).sort((a, b) => a.id - b.id); // Eliminar duplicados

                if (nuevaClausura.length > 0) {
                    const clausuraKey = nuevaClausura.map(e => e.id).sort().join(',');
                    if (!procesados.has(clausuraKey)) {
                        const nuevoId = idEstado++;
                        procesados.set(clausuraKey, {
                            id: nuevoId,
                            closure: nuevaClausura,
                        });
                        pendientes.push(nuevaClausura);
                    }

                    afd[actualId].transitions[letra] = procesados.get(clausuraKey).id;
                }
            });
        });
    }

    // Identificar estados finales del AFD
    // Object.values(afd).forEach((estadoAfd) => {
    //     estadoAfd.final = estadoAfd.closure.some((estado) => estado.final); // Verificar si algún estado de la clausura es final
    // });

    Object.values(afd).forEach((estadoAfd) => {
        estadoAfd.final = estadoAfd.closure.some((estado) =>
            afnd.final.id === estado.id // Verifica si el ID del estado pertenece a los finales del AFND
        );
    });

    console.log("AFD generado:", afd);
    return afd;
}


function procesarAFND(afnd) {
    let statesAfd =0;
    const closureInicial = epsClosure(afnd.inicial);
    const procesados = new Set(); // No repetir estados
    const afd = {};

    closureInicial.forEach((estado) => {
        if (procesados.has(estado.id)) return; // Evita reprocesar estados
        procesados.add(estado.id);

        // Mostrar la clausura del estado actual
        const closure = epsClosure(estado);
        console.log(`Closure-${estado.id}: [${closure.map(e => e.id).join(", ")}]`);
        $('#resultado').append(`<br>Closure-${estado.id}: [${closure.map(e => e.id).join(", ")}]`);
        afd.id = statesAfd++;
        afd.closure = closure;

        // Recorrer todas las transiciones del estado
        Object.keys(estado.transitions).forEach((letra) => {
            estado.transitions[letra].forEach((estadoDestino) => {
                console.log(`Transición de ${estado.id} con '${letra}': ${estadoDestino.id}`);
                $('#resultado').append(`<br>Transición de ${estado.id} con '${letra}': ${estadoDestino.id}`);

                // Mostrar la clausura del estado destino
                const closureDestino = epsClosure(estadoDestino);
                console.log(`${estadoDestino.id}: Closure: [${closureDestino.map(e => e.id).join(", ")}]`);
                $('#resultado').append(`<br>${estadoDestino.id}: Closure: [${closureDestino.map(e => e.id).join(", ")}]`);
            });
        });
    });
}


function imprimirEstado(estado, seen) {

    if (seen.has(estado)) {
        return; // Evita procesar un estado que ya visitaste
    }
    seen.add(estado);

    // Construir una representación no circular de las transiciones
    const transicionesSimplificadas = {};
    for (const [clave, estadosDestino] of Object.entries(estado.transitions)) {
        transicionesSimplificadas[clave] = estadosDestino.map(e => e.id);
    }

    $('#resultado').append(`<br>Estado ID: ${estado.id}<br>` +
        `Transiciones: ${JSON.stringify(transicionesSimplificadas)}<br>` +
        // `Número de transiciones: ${Object.keys(transicionesSimplificadas).length}<br>` +
        `Epsilon: [${estado.epsilon.map(e => (e ? e.id : "null")).join(", ")}]<br>`);

    estado.epsilon.forEach((e) => {
        if (e) imprimirEstado(e, seen); // Recursivo
    });

    Object.values(estado.transitions).forEach((transiciones) => {
        transiciones.forEach((estadoDestino) => {
            imprimirEstado(estadoDestino, seen);
        });
    });
}



function renderTree(nodo) {
    if (!nodo) return '';

    switch (nodo.type) {
        case 'nodo':
            return `<li>Node: ${nodo.value}</li>`;
        case 'concat':
            return `
                <li>Concatenación
                    <ul>
                        ${renderTree(nodo.left)}
                        ${renderTree(nodo.right)}
                    </ul>
                </li>
            `;
        case 'union':
            return `
                <li>Unión
                    <ul>
                        ${renderTree(nodo.left)}
                        ${renderTree(nodo.right)}
                    </ul>
                </li>
            `;
        case 'star':
            return `
                <li>Star
                    <ul>
                        ${renderTree(nodo.operando)}
                    </ul>
                </li>
            `;
        default:
            return `<li>Tipo no definido</li>`;
    }
}

function parse(p, last = 0) {
    let v = null; // Inicializat árbol vacío
    while (p.charAt(last) !== '$') {
        const current = p.charAt(last);

        if (/^[a-zA-Z0-9]$/.test(current) || current === 'ε') { // Caracter normal
            const vr = { type: 'nodo', value: current };
            if (v) {
                v = { type: 'concat', left: v, right: vr };
            } else {
                v = vr;
            }
            last++;
        } else if (current === '|') { // Operador OR
            const [vr, newLast] = parse(p, last + 1);
            v = { type: 'union', left: v, right: vr };
            last = newLast;
        } else if (current === '*') { // Operador estrella
            v = { type: 'star', operando: v };
            last++;
        } else if (current === '(') { // Paréntesis de apertura
            const [vr, newLast] = parse(p, last + 1);
            last = newLast + 1;
            if (v) {
                v = { type: 'concat', left: v, right: vr };
            } else {
                v = vr;
            }
        } else if (current === ')') { // Paréntesis de cierre
            return [v, last];
        } else {
            throw new Error(`Carácter inesperado: ${current}`);
        }
    }

    return [v, last];
}

function thompson(regexp){
    const tree = parse(regexp+"$", 0);
    // console.log('Dentro de thompson: '+ JSON.stringify(tree));
    const automata = thompson_recur(tree[0]);

    // console.log('Autómata: '+JSON.stringify(automata));
    // if (!automata) {
    //     throw new Error('Dentro de thompson: el autómata generado no existe.');
    // }
    return automata;

}

function thompson_recur(v){
    // console.log('Thompson_recur tree:'+JSON.stringify(tree));
    // console.log('tree[0].type: '+tree[0].type);
    // const v = tree[0];
    // console.log('v:'+JSON.stringify(v));
    // console.log('v.type: '+v.type);
    // console.log('v.left:'+JSON.stringify(v.left));
    // console.log('v.right:'+JSON.stringify(v.right));
    if(v.type === 'nodo'){ /********* Nodo terminal (carácter o ε) *********/
        // console.log('v tipo nodo: '+JSON.stringify(v));
        const inicial = new State();
        const final = new State();
        if (v.value === 'ε') {
            // console.log('Vacío');
            inicial.epsilon.push(final);
        } else {
            inicial.transitions[v.value] = [final];
        }
        return new AFND(inicial, final);
    } else if (v.type === 'union') {
        const aut_vl = thompson_recur(v.left); // Hacer el autómata de Thompson para el subarbol izquierdo de la unión
        const aut_vr = thompson_recur(v.right);// Hacer el autómata de Thompson para el subarbol derecho de la unión
        // Crear nuevos estados inicial y final
        const inicial = new State();
        const final = new State();
        // Agregar dos trancisiones ε al nuevo estado inicial que apunten a los estados iniciales de cada subarbol de la unión.
        inicial.epsilon.push(aut_vl.inicial, aut_vr.inicial);
        //
        aut_vl.final.epsilon.push(final);
        aut_vr.final.epsilon.push(final); 
        return new AFND(inicial, final); 
    } else if (v.type === 'concat') {
        const aut_vl = thompson_recur(v.left);
        const aut_vr = thompson_recur(v.right);
        Object.assign(aut_vl.final.transitions, aut_vr.inicial.transitions);
        aut_vl.final.epsilon = aut_vr.inicial.epsilon;
        return new AFND(aut_vl.inicial, aut_vr.final);
    } else if (v.type === "star"){
        const aut_vs = thompson_recur(v.operando);
        const inicial = new State();
        const final = new State();
        inicial.epsilon.push(aut_vs.inicial, final);
        // console.log(`aut_vs.inicial.id: ${aut_vs.inicial.id}\naut_vs.final.id: ${aut_vs.final.id}`);
        aut_vs.final.epsilon.push(aut_vs.inicial,final);
        // console.log(`Epsilon de inicial: [${inicial.epsilon.map(e => (e ? e.id : "null")).join(", ")}]\n`);
        // console.log(`Epsilon de aut_vs.final: [${aut_vs.final.epsilon.map(e => (e ? e.id : "null")).join(", ")}]\n`);
        
        return new AFND(inicial,final);
    }
    
}

function epsClosure(estado) {
    const closure = new Set(); // Set evita duplicados
    const stack = [estado]; // Pila de estados pendientes

    while (stack.length > 0) {
        const actual = stack.pop();

        if (!closure.has(actual)) {
            closure.add(actual); // 

            actual.epsilon.forEach((e) => { // transiciones epsilon del estado actual
                if (e) { // Ignorar estados null 
                    stack.push(e);
                }
            });
        }
    }

    return Array.from(closure);
}


function convertirAFNDaDFA(afn) {
    return { transitions: [] }; // Estructura final de las transiciones
}

function mostrarResultado(transitions) {
    const resultsDiv = $('#resultado');
    resultsDiv.empty();

    if (!transitions.length) {
        resultsDiv.append('<p>No se generaron transiciones</p>');
        return;
    }

    const table = $('<table class="table table-bordered"></table>');
    table.append('<thead><tr><th>Estado Inicial</th><th>Símbolo</th><th>Estado Final</th></tr></thead>');

    const tbody = $('<tbody></tbody>');
    transitions.forEach(({ from, symbol, to }) => {
        const row = `<tr><td>${from}</td><td>${symbol}</td><td>${to}</td></tr>`;
        tbody.append(row);
    });

    table.append(tbody);
    resultsDiv.append(table);
}

function visualizeAFND(afnd) {
    const visitado = new Set();
    const queue = [afnd.inicial];
    let vista = `Estado inicial: ${afnd.inicial.id}\nEstado final ${afnd.final.id}\n\n`;

    while (queue.length > 0) {
        const estado = queue.shift();
        if (visitado.has(estado)) continue;
        visitado.add(estado);

        for (const [symbol, estados] of Object.entries(estado.transitions)) {
            vista += `State ${estado.id} --${symbol}--> ${estados.map(s => s.id).join(', ')}\n`;
            queue.push(...estados);
        }
        for (const estadoEpsilon of estado.epsilon) {
            vista += `State ${estado.id} --ε--> ${estadoEpsilon.id}\n`;
            queue.push(estadoEpsilon);
        }
    }

    return vista;
}

class State {
    constructor() {
        this.id = idState++; // Asignar un ID único al estado
        this.transitions = {}; // { 'a': [1, 2] }
        this.epsilon = []; // Transiciones epsilon
    }
}

class AFND {
    constructor(inicial, final) {
        this.inicial = inicial;
        this.final = final;
    }
}