let idState = 0;

$(document).ready(function () {
    $('#btn-generar').on('click',function () {
        const regexp = $('#regexp').val().trim();
        if (!regexp) {
            alert('Por favor ingresa una expresión regular');
            return;
        }

        // TODO: Llama a las funciones para construir el AFN y convertirlo a AFD
        // const results = thompsonToAFD(regexp);
        // mostrarResultado(results);
    });
    $('#btn-parsear').on('click', function(){
        const regexp = $('#regexp').val().trim();
        if (!regexp) {
            alert('Por favor ingresa una expresión regular válida');
            return;
        }
        
        try {
            const [parsedTree] = parse(regexp+"$", 0);
            const treeHtml = renderTree(parsedTree);
            $('#resultado').empty();
            $('#resultado').html(`<ul>${treeHtml}</ul>`); 
            console.log('Parseo: '+ JSON.stringify(parsedTree));
            $('#resultado').append('Parseo completado con éxito');
            $('#resultado').append(JSON.stringify(parsedTree));
        } catch (e) {
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

            }
            // console.log('AFND: '+ JSON.stringify(afnd);
            console.log('AFND: '+ visualizeAFND(afnd));
            // $('#resultado').append('Autómata Finito No Determinista');
            // $('#resultado').append(JSON.stringify(afnd));
            const afndVisualization = visualizeAFND(afnd);
            $('#resultado').html(`<pre>${afndVisualization}</pre>`);
        } catch (e) {
            console.error(e);
            $('#resultado').empty();
            $('#resultado').text('Error al construir AFND: ' + e.message);
        }
    });
});




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

    // console.log(automata);
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
    if(v.type === 'nodo'){ // Nodo terminal (carácter o ε)
        // console.log('v tipo nodo: '+JSON.stringify(v));
        const inicial = new State();
        const final = new State();
        if (v.value === 'ε') {
            inicial.epsilon.push(final);
        } else {
            inicial.transitions[v.value] = [final];
        }
        return new AFND(inicial, final);
    } else if (v.type === 'union') {
        const aut_vl = thompson_recur(v.left);
        const aut_vr = thompson_recur(v.right);
        const inicial = new State();
        const final = new State();
        inicial.epsilon.push(aut_vl.inicial, aut_vr.inicial);
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
        aut_vs.final.epsilon.push(aut_vs.inicial,final);
        return new AFND(inicial,final);
    }
    
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
        for (const epsilonState of estado.epsilon) {
            vista += `State ${estado.id} --ε--> ${epsilonState.id}\n`;
            queue.push(epsilonState);
        }
    }

    return vista;
}

class State {
    constructor() {
        this.id = idState++; // Asignar un ID único al estado
        this.transitions = {}; // { 'a': [estado1, estado2] }
        this.epsilon = []; // Transiciones epsilon
    }
}

class AFND {
    constructor(inicial, final) {
        this.inicial = inicial;
        this.final = final;
    }
}