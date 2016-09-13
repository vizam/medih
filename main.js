
// Interface language from i18n - add listener to elements with data-tooltip info

var elementos = document.getElementsByTagName('*');
var longitud = elementos.length;
for (var x = 0; x < longitud; x +=1) {
  if (elementos[x].dataset) {
    if (elementos[x].dataset.inner) {
      elementos[x].innerHTML = chrome.i18n.getMessage(elementos[x].dataset.inner);
    }
    if (elementos[x].dataset.placeholder) {
      elementos[x].placeholder = chrome.i18n.getMessage(elementos[x].dataset.placeholder);
    }
    if (elementos[x].dataset.tooltip) {
      elementos[x].addEventListener('mouseenter', ayudaEmergente);
      elementos[x].addEventListener('mouseleave', ayudaEmergente);
    }
  }
}

function ayudaEmergente(evt) {
  // getBoundingClientRect() --> { bottom: xx, height:xx, left:xx, right:xx ,top:xx, width:xx }
  var div = document.getElementById('tooltip');
  var texto = document.getElementById('tooltipTexto');
  var causante = evt.target.getBoundingClientRect();
  var abscisa = causante.right - (causante.width / 2); //punto central de causante en eje x
  var ordenada = causante.top + (causante.height / 2); //punto central de causante en eje y, no se utiliza por ahora
  if (evt.type == 'mouseenter') {
    texto.innerHTML = chrome.i18n.getMessage(evt.target.dataset.tooltip);
    var emergente = div.getBoundingClientRect();
    var divx = div.getBoundingClientRect().width;
    var divy = div.getBoundingClientRect().height;
    div.style.left = abscisa - (divx / 2) + 'px';
    div.style.top = causante.bottom + 20 + 'px';
    div.style.opacity = 1;
  } else {
    div.style.opacity = 0;
  }
}


//Inicio de DB

var db;
function abrirDB() {
  var requestDB = indexedDB.open('ConsultaDB', 1); // return IDBOpenDBRequest object
  requestDB.onupgradeneeded = function () {
    db = requestDB.result; // instance de IDBDatabase
    db.createObjectStore('Pacientes', { keyPath: 'id' });
    db.createObjectStore('Medicamentos', { autoIncrement: 'true'});
    db.createObjectStore('Preferencias');
    db.createObjectStore('Fotos');
  }
  requestDB.onerror = function(evt) {
    mensajeEstado(requestDB.error);  
  }
  requestDB.onsuccess = function(evt) {
    db = requestDB.result; // instance of IDBDatabase
    db.onerror = function(evt) {                          //Since subprocess errors bubble up to IDBDatabase
      mensajeEstado(evt.target.error);                    //this will handle any error downside
    }                                                     //evt.target will be the srcElement, not db
    cargarRecipe();                                       //transaction or request objects
    cargarMedicamentos();
  }                                                        
}
abrirDB();

// divPaciente

var paciente = {};
document.getElementById('id').addEventListener('keypress', buscarPaciente);
function buscarPaciente(evt) {
  var id = evt.target.value;
  if (!isNaN(parseInt(id)) && (evt.code == 'Enter' || evt.code == 'NumpadEnter')) {
    var transaccion = db.transaction(['Pacientes'], 'readonly'); // return transaction object with IDBIndex.objectStore method
    var almacen = transaccion.objectStore('Pacientes'); // return IDBObjectStore
    var request = almacen.get(id);                      // return IDBRequest
    request.onsuccess = function() {
      var formulario = document.getElementById('formaPaciente');
      var longitud = document.getElementById('formaPaciente').length; 
      if (request.result == undefined) {
        resetFoto();
        document.getElementById('id').disabled = true;
        //document.getElementById('botonPaciente').disabled = false;
        for (var x = 1; x < longitud; x +=1) {   // x = 0 es campo _id
            //formulario.elements[x].value = null;  
            formulario.elements[x].disabled = false;  
        }
        document.getElementById('nombre').focus();
        mensajeEstado(chrome.i18n.getMessage('mensaje_registronuevo'));
      } else {
        paciente = request.result; // variable global
        document.getElementById('id').disabled = true;
        document.getElementById('botonPaciente').disabled = true;
        document.getElementById('botonProgreso').disabled = false;
        for (var x = 0; x < (longitud - 2); x += 1) {
          formulario.elements[x].value = paciente[formulario.elements[x].id];
        }
        document.getElementById('nombreTop').value = (paciente.apellido + ', ' + paciente.nombre).toUpperCase();
        calcularEdad();
        iconos();
        mostrarFoto();
        insertarFechas();
        completarRecipe();
      }
    }
  }
}

function calcularEdad(){
  var hoy = new Date();
  var cadena = document.getElementById('nacimiento').value;
  var arreglo = cadena.split('/');
  var birth = new Date(arreglo[0], (arreglo[1] - 1), arreglo[2]); // Ajustar el mes, basado en 0-11
  var edad = (hoy.getFullYear() - birth.getFullYear()) -  
         (hoy.getMonth() < birth.getMonth());
  document.getElementById('edad').value = edad;
}

function resetFoto() {
  var canvas = document.getElementById('retrato');
  var ctx = canvas.getContext('2d');
  var imagen = new Image();
  imagen.onload = function() {
    ctx.clearRect(0, 0, 160, 120);
    ctx.drawImage(imagen, 0, 0, 160, 120);
  }
  imagen.src = 'foto.png';
}
function mostrarFoto() {
  var url;
  var imagen = new Image();
  imagen.onload = function() {
    ctx.drawImage(imagen, 0, 0, 160, 120);
    if (url) URL.revokeObjectURL(url);
  }
  var canvas = document.getElementById('retrato');
  var ctx = canvas.getContext('2d');
  var id = document.getElementById('id');
  var transaccion = db.transaction(['Fotos'], 'readonly'); 
  var almacen = transaccion.objectStore('Fotos'); 
  var request = almacen.get(id.value);                  
  request.onsuccess = function(evt) {
    var blob = evt.target.result;
    if (!blob) {
      imagen.src = 'foto.png';
      return;
    }
    url = URL.createObjectURL(blob);
    imagen.src = url;
  }
}
document.getElementById('buscarFoto').addEventListener('click', escogerFoto);
function escogerFoto(evt) {
  var formatos = ['image/jpeg', 'image/png'];
  chrome.fileSystem.chooseEntry({type:'openFile'}, function (elegido) { //elegido es Object FileEntry, solo lectura
    if (chrome.runtime.lastError) return; // en caso que el usuario no elija nada
    elegido.file(function(file) { // file es Object File
      if (formatos.indexOf(file.type) == -1) {// || file.size > 400000) {
        fotoInvalida(file.type, file.size);
        return;
      }
      createImageBitmap(file).then(function(result) {
        fotoValida(result);
      })
    })
  })
  function fotoValida(bitmap) {
    var retrato = document.getElementById('retrato');
    var ctx = retrato.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, 160, 120);
  }
  function fotoInvalida(type, size) {
    mensajeEstado(chrome.i18n.getMessage('mensaje_fotoinvalida'));
  }
}
document.getElementById('grabarFoto').addEventListener('click', guardarFoto);
function guardarFoto() {
  var canvas = document.getElementById('retrato');
  var id = document.getElementById('id');
  if (Object.keys(paciente) != 0) { // solo true si hay paciente escogido o recien grabado
    canvas.toBlob(function(blob) { //formato predeterminado es png
      var transaccion = db.transaction(['Fotos'], 'readwrite');
      var almacen = transaccion.objectStore('Fotos');
      var request = almacen.put(blob, id.value);                    
      request.onsuccess = function(evt) {
        mensajeEstado(chrome.i18n.getMessage('mensaje_fotovalida'));
      }
    }) 
  }
}


document.getElementById('botonPaciente').addEventListener('click', grabarPaciente);
function grabarPaciente() {
  var id = document.getElementById('id').value;
  var nombre = document.getElementById('nombre').value;
  var apellido = document.getElementById('apellido').value;
  var nacimiento = document.getElementById('nacimiento').value;
  if (id && nombre && apellido && nacimiento) {
    var arreglo = nacimiento.split('/');
    var fdn = new Date(arreglo[0], arreglo[1], arreglo[2]);
    if (fdn.toString() == 'Invalid Date') {
      document.getElementById('nacimiento').value = null;
      mensajeEstado(chrome.i18n.getMessage('mensaje_fechainvalida'));
      return;
    }
    var forma = document.getElementById('formaPaciente');
    var longitud = forma.length;
    var objeto = {};
    for (var x = 0; x < (longitud - 2); x += 1) { // excluye los dos botones del final
      objeto[forma.elements[x].id] = forma.elements[x].value;
    }
    var transaccion = db.transaction(['Pacientes'], 'readwrite'); //return IDBTransaction object 
    var objectStore = transaccion.objectStore('Pacientes');
    var request = objectStore.add(objeto); // para update, se usa put()
    request.onsuccess = function() {
      paciente = objeto; //paciente es variable global
      for (var y = 0; y < (longitud - 1); y += 1) {
        forma.elements[y].disabled = true;
      }
      //document.getElementById('grabarFoto').disabled = false;
      document.getElementById('botonProgreso').disabled = false;
      document.getElementById('nombreTop').value = (apellido + ', ' + nombre).toUpperCase();
      calcularEdad();
      completarRecipe();
      iconos();
      mensajeEstado(chrome.i18n.getMessage('mensaje_registroagregado'));
    }
  } else {
    mensajeEstado(chrome.i18n.getMessage('mensaje_camposrequeridos'));
  }
}



// divProgreso


function insertarFechas() { 
  var select = document.getElementById('fechas');
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }
  if (paciente.progreso) {
    var option; 
    for (var x of paciente.progreso) {
        option = document.createElement('option');
        option.text = x.fecha.toDateString();
        select.add(option);
    }
  }
}            

document.getElementById('fechas').addEventListener('change', verProgreso);
function verProgreso() {  
  var fecha = document.getElementById('fechas').value; //elemento SELECT
  var forma = document.getElementById('formaProgreso');
  var longitud = 6; //longitud de forma hasta el ultimo <textarea>
  var x;
  var y;
  if (fecha == 'hoy') {
    for (x = 0; x < longitud; x += 1) {
      forma.elements[x].value = null;
      forma.elements[x].disabled = false;
      document.getElementById('botonProgreso').disabled = false;
    }
    forma.elements[0].focus();
  } else {
    for (x of paciente.progreso) {
      if (x.fecha.toDateString() == fecha) {
        for (y = 0; y < longitud; y += 1) {
          forma.elements[y].value =  x[forma.elements[y].id];
          forma.elements[y].disabled = true;
        }
        document.getElementById('botonProgreso').disabled = true;
      }
    }
  }
}

document.getElementById('botonProgreso').addEventListener('click', grabarProgreso);
function grabarProgreso() {  
  var id = document.getElementById('id').value;
  var forma = document.getElementById('formaProgreso');
  var longitud = 6; //seis primeros campos, textarea
  var hoy = new Date();
  var objeto = {};
  var x;
  objeto.fecha = hoy; 
  for (x = 0; x < longitud ; x += 1) { 
    objeto[forma.elements[x].id] = forma.elements[x].value;
  }
  var transaccion = db.transaction(['Pacientes'], 'readwrite'); // return transaction object with IDBIndex.objectStore method
  var almacen = transaccion.objectStore('Pacientes'); // return IDBObjectStore
  var request = almacen.get(id);                      // return IDBRequest
  request.onsuccess = function() {
    var datos = request.result;
    if (datos == undefined) return;
    if (datos.progreso) {
      for (x = 0; x < (datos.progreso.length); x += 1) {
        if (datos.progreso[x].fecha.toDateString() == hoy.toDateString()) {
          mensajeEstado(chrome.i18n.getMessage('mensaje_progresoexistente'));
          return;
        }
      }
      datos.progreso.push(objeto);
    } else {
      datos.progreso = [objeto];
    }
    var requestUpdate = almacen.put(datos);
    requestUpdate.onsuccess = function() {
      paciente = datos;
      mensajeEstado(chrome.i18n.getMessage('mensaje_progresoagregado'));
      insertarFechas();
      for (x = 0; x < longitud ; x += 1) {
        forma.elements[x].disabled = true;
      }
      document.getElementById('botonProgreso').disabled = true;
    }
  }
}


// divTratamiento


function completarRecipe() {
    elemento = document.getElementById('tablaPrescripcion');
    elemento.rows[6].cells[1].innerHTML = document.getElementById('nombreTop').value;
    elemento.rows[6].cells[3].innerHTML = document.getElementById('edad').value;
    elemento.rows[7].cells[1].innerHTML = document.getElementById('id').value;
    elemento.rows[7].cells[3].innerHTML = new Date().toDateString(); 
}


var medicinas;
function cargarMedicamentos() {
  medicinas = []; 
  var cursor;
  var transaccion = db.transaction(['Medicamentos'], 'readonly'); // return transaction object with IDBIndex.objectStore method
  var almacen = transaccion.objectStore('Medicamentos');          // return IDBObjectStore
  var request = almacen.openCursor();                              // return IDBRequest
  request.onsuccess = function() { //cada vez que el cursor itera con exito, repite la funcion
    cursor = request.result; // return IDBCursor 
                             //If not empty, IDBCursorWithValue(tiene property value), direction: 'next'
    if (cursor) {
      medicinas.push(cursor.value);
      cursor.continue(); 
    } 
  }
}

document.getElementById('medicamento').addEventListener('keyup', medicamentoOpciones);
function medicamentoOpciones(evt) {
  var indice1;
  var indice2;
  var fila;
  var celda;
  var tabla = document.getElementById('tablaOpciones'); 
  var campo = document.getElementById('medicamento');
  var indicacion = document.getElementById('indicacion');
  var cadena = campo.value;
  var bloque = document.getElementById('divWidget')
  var vecino = bloque.previousElementSibling;
  if (evt.code == 'Enter' || evt.code == 'NumpadEnter' && cadena) {
    indicacion.focus();
    return;
  }
  // getBoundingClientRect() --> { bottom: xx, height:xx, left:xx, right:xx ,top:xx, width:xx }
  var rectangulo = vecino.getBoundingClientRect();
  if (cadena == '') {
    bloque.style.display = 'none';
    return;
  }
  // reiniciar tabla con cada busqueda
  while (tabla.hasChildNodes()) {
    tabla.removeChild(tabla.firstChild);
  }
  if (medicinas) { // variable global
    medicinas.forEach(function(valor, indice, objeto) {
      indice1 = valor.marca.toUpperCase().indexOf(cadena.toUpperCase()); //el metodo search utiliza RE 
      indice2 = valor.ingrediente.toUpperCase().indexOf(cadena.toUpperCase()); //da error con parentesis incompleto
      if (cadena != '' && (indice1 == 0 || indice2 == 0)) {
        fila = document.createElement('tr');
        celda = document.createElement('td');
        contenido = valor.marca.toUpperCase() + ' ' + '(' + valor.ingrediente + ')' + ' ' + valor.presentacion;
        celda.innerHTML = contenido;
        fila.appendChild(celda);
        tabla.appendChild(fila);
      }
    })  
    if (tabla.hasChildNodes()) {
      bloque.style.display = 'block';
      bloque.style.width = rectangulo.width + 'px';
      var hijos = tabla.children.length;
      for (var x = 0; x < hijos; x +=1) {
        tabla.rows[x].cells[0].addEventListener('click', escogerMedicamento);
      }
      function escogerMedicamento(evt) {
        campo.value = evt.target.innerHTML;
        bloque.style.display = 'none';
      }
    } else {
      bloque.style.display = 'none';
    }
  }
}

//document.getElementById('medicamento').addEventListener('blur', blurOpciones);
//function blurOpciones() {
//  document.getElementById('divWidget').style.display = 'none';  
//}


document.getElementById('indicacion').addEventListener('keypress', (evt) => {
  if (evt.code == 'Enter' || evt.code == 'NumpadEnter') {
  document.getElementById('botonAgregarPrescripcion').click();
  evt.preventDefault();
  }
});
document.getElementById('botonAgregarPrescripcion').addEventListener('click', agregarPrescripcion);
function agregarPrescripcion() {
  var medicamento = document.getElementById('medicamento');
  var indicacion = document.getElementById('indicacion');
  var celda = document.getElementById('tablaPrescripcion').rows[4].cells[0];
  var hijos = celda.children.length; // Cantidad de elementos, excluye nodeText y comentarios
  var lineaTope = 50;                // maximo numero de chars permitidos por linea  
  var celdaTope = 22;                // Mayor numero de lineas que caben en celda 
  var lineasPrevias = 0;             // inicializar para poder utilizar operador +=
  //After \r on <textarea> element, the unused space is not counted on innerHTML length
  //so is a user split the entry too much, it will produce bad results
  //Since a return listener will be implemented , user wont be able to use \r for formatting
    for (var x = 0; x < hijos; x += 1) {
      lineasPrevias += Math.ceil(celda.children[x].innerHTML.length / lineaTope) + 
                        //(celda.children[x].innerHTML.length % lineaTope > 0)) +
                        Number.isInteger(x/2);  // Cada hijo impar genera una linea (margintop) adicional 
    }
  var lineasNuevas = Math.ceil(medicamento.value.length / lineaTope)// + (medicamento.value.length % lineaTope > 0)) + 
                     + Math.ceil(indicacion.value.length / lineaTope)// + (indicacion.value.length % lineaTope > 0)) + 1);
                      + 1;
                      console.log('total de lineas');
                      console.log(lineasPrevias + lineasNuevas);
  if ((medicamento.value && indicacion.value) && (lineasPrevias + lineasNuevas <= celdaTope)) {
    for (var x of [medicamento.value, indicacion.value]) {
      var elemento = document.createElement('P');
      var texto = document.createTextNode(x);
      elemento.appendChild(texto);
      celda.appendChild(elemento);
    }
    medicamento.value = null;
    medicamento.focus();
    indicacion.value = null;
  } else if (lineasPrevias + lineasNuevas > celdaTope) {
    mensajeEstado(chrome.i18n.getMessage('mensaje_prescripcionlarga'));
  } else if (!medicamento.value || !indicacion.value) {
    mensajeEstado(chrome.i18n.getMessage('mensaje_prescripcionincompleta'));
  }
}

document.getElementById('botonRemoverUltimo').addEventListener('click', removerUltimo);
function removerUltimo() {
  var elemento = document.getElementById('tablaPrescripcion');
  var celda = elemento.rows[4].cells[0];
  var longitud = celda.childNodes.length; 
  if (longitud > 0) {
      celda.removeChild(celda.lastChild);
      celda.removeChild(celda.lastChild);
  }
}

document.getElementById('botonImprimirRecipe').addEventListener('click', imprimirRecipe);
function imprimirRecipe() {
  var recipe = document.getElementById('tablaPrescripcion');
  var recipeIzq = recipe.cloneNode(true);
  var recipeDer = recipe.cloneNode(true);
  var divIzq = document.getElementById('divRecipeIzq');
  var divDer = document.getElementById('divRecipeDer');
  if (divIzq.lastChild && divDer.lastChild) {
      divIzq.removeChild(divIzq.lastChild);
      divDer.removeChild(divDer.lastChild);
  }
  divIzq.appendChild(recipeIzq);
  divDer.appendChild(recipeDer);
  window.print();
}

document.getElementById('botonGrabarMedicamento').addEventListener('click', grabarMedicamento);
function grabarMedicamento() {
  var formulario = document.getElementById('formaMedicamentoDB');
  var objeto = {};
  for (var x = 0; x < 3; x += 1) {
    objeto[formulario.elements[x].id] = formulario.elements[x].value;
  }
  if (!objeto.presentacion || !(objeto.marca || objeto.ingrediente)) {
    mensajeEstado(chrome.i18n.getMessage('mensaje_marcaingredienterequeridos'));
    return;
  }
  var transaccion = db.transaction(['Medicamentos'], 'readwrite'); // return transaction object with IDBIndex.objectStore method
  var almacen = transaccion.objectStore('Medicamentos');              // return IDBObjectStore
  var request = almacen.add(objeto);                                   // return IDBRequest
  request.onsuccess = function() {
    for (var y = 0; y < 3; y += 1) {
      formulario.elements[y].value = null;
    }
    mensajeEstado(chrome.i18n.getMessage('mensaje_medicamentograbado'));
    cargarMedicamentos();
  }
}   


// divPreferencias


function cargarRecipe() {
  var formulario = document.getElementById('formaRecipe');
  var tabla = document.getElementById('tablaPrescripcion');
  var celda = tabla.rows[0].cells[0]; // celda para link de setup prescription
  var longitud = 6;                                               //seis primeros elementos del formulario, incluye fieldset
  var transaccion = db.transaction(['Preferencias'], 'readonly'); // return transaction object with IDBIndex.objectStore method
  var almacen = transaccion.objectStore('Preferencias');          // return IDBObjectStore
  var request = almacen.get('recipe');                            //return IDBRequest
  request.onsuccess = function() {
    if (request.result) {
      if (celda.children.length > 0) {
        celda.removeChild(celda.lastChild); //borrar link de setup prescription antes de insertar los datos
      }
    var objeto = request.result;
      for (var x = 0; x < longitud; x += 1) {
        if (x != 0 && x != 4) { //saltar los fieldsets
         formulario.elements[x].value = objeto[formulario.elements[x].id];
        }
      }
      for (var y = 0; y < 6; y +=1) { 
        if (y != 3 && y !=4) {
            tabla.rows[y].cells[0].innerHTML = objeto[tabla.rows[y].className];
        }
      }
    } else {
      celda.firstChild.addEventListener('click', (evt) => {
        document.getElementById('linkPreferencias').click();
      });
    }
  }
}

document.getElementById('botonConfigurarRecipe').addEventListener('click', configurarRecipe);
function configurarRecipe() {
  var formulario = document.getElementById('formaRecipe');
  var longitud = 6; //seis primeros elementos del formulario, incluye fieldset
  var transaccion = db.transaction(['Preferencias'], 'readwrite'); // return transaction object with IDBIndex.objectStore method
  var almacen = transaccion.objectStore('Preferencias'); // return IDBObjectStore
  var request = almacen.get('recipe');                         // return IDBRequest
  request.onsuccess = function() {
    if (request.result) {
      var objeto = request.result;
      for (var x = 0; x < longitud; x += 1) {
        if (x !=0 && x !=4) { //saltar los fieldset
          objeto[formulario.elements[x].id] = formulario.elements[x].value;
        }
      }
      var requestPut = almacen.put(objeto, 'recipe');
      requestPut.onsuccess = function() {
        mensajeEstado(chrome.i18n.getMessage('mensaje_preferenciagrabada'));
      }
    } else {
      var objeto = {};
      for (var x = 0; x < longitud; x += 1) {
        if (x != 0 && x != 4) { //saltar los fieldsets
         objeto[formulario.elements[x].id] = formulario.elements[x].value;
        }
      }
      var requestAdd = almacen.add(objeto, 'recipe');
      requestAdd.onsuccess = function() {
        mensajeEstado(chrome.i18n.getMessage('mensaje_preferenciagrabada'));
      }
    }
    cargarRecipe();
  }
}

//Funciones Generales

var divActivo = 'divPaciente';
var linkActivo = 'linkHome'; 
document.getElementById('linkHome').addEventListener('click', cambiarDiv);
document.getElementById('linkProgreso').addEventListener('click', cambiarDiv);
document.getElementById('linkTratamiento').addEventListener('click', cambiarDiv);
document.getElementById('linkPreferencias').addEventListener('click', cambiarDiv);
function cambiarDiv(evt) {
  document.getElementById(divActivo).style.display = 'none';
  document.getElementById(evt.target.dataset.div).style.display = 'flex';
  divActivo = evt.target.dataset.div;
  document.getElementById(linkActivo).className = '';
  document.getElementById(evt.target.dataset.link).className = 'active';
  linkActivo = evt.target.dataset.link;
}

function mensajeEstado(mensaje) {
  var padre = document.getElementById('padre');
  var hijo = document.getElementById('transaccion');
  hijo.remove();
  hijo.innerHTML = mensaje;
  padre.appendChild(hijo);
}

function iconos() { //muestra u oculta imagenes con class='boton', modifica opacidad de canvas
  var visibilidad = (Object.keys(paciente) != 0) ? 'visible':'hidden';
  var opacidad = (Object.keys(paciente) != 0) ? 1 : 0.4;
  document.getElementById('buscarFoto').style.visibility = visibilidad;
  document.getElementById('grabarFoto').style.visibility = visibilidad;
  document.getElementById('retrato').style.opacity = opacidad;
}
 
document.getElementById('botonReiniciar').addEventListener('click', recargarApp);
function recargarApp() {
  paciente = {};
  document.getElementById('nombreTop').value = null;
  document.getElementById('edad').value = null;
  var formaPaciente = document.getElementById('formaPaciente');
  for (var x = 1; x < (formaPaciente.length -1); x +=1) { //saltar campo id y excluir ultimo boton recargar App
    formaPaciente.elements[x].value = null;
    formaPaciente.elements[x].disabled = true;
  }
  document.getElementById('id').disabled = false;
  document.getElementById('id').value = null;
  document.getElementById('id').focus();
  var formaProgreso = document.getElementById('formaProgreso');
  for (var y = 0; y < (formaProgreso.length - 3); y += 1) {
    formaProgreso.elements[y].value = null;
    formaProgreso.elements[y].disabled = false;
  }
  document.getElementById('botonProgreso').disabled = true;
  resetFoto();
  iconos();
  insertarFechas();
  completarRecipe();
}

resetFoto();
