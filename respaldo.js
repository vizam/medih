

var fs = require('fs-extra');
var path = require('path');
var homedrive = process.env.HOMEDRIVE; //"C:"
var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default" here \IndexedDB is required
var carpetaidb = path.sep + "IndexedDB"; //fs.copy for directory ignore parent directory
//var extension = 'chrome-extension_knflkdhigackechbcekfmopblebljndk_0.indexeddb.leveldb';


chrome.storage.local.get('ruta', (objeto) => { 
  var ruta = objeto.ruta;
  var forma = document.getElementById('formaRespaldo');
  var cintillo = document.getElementById('infoRuta'); // input type text element from formaRespaldo
  if (ruta) {
    cintillo.value = ruta; 
    cintillo.style.color = 'Green';
  } else {
    cintillo.value =  chrome.i18n.getMessage('otros_opcionnoasignada');
    cintillo.style.color = 'Red';
  } 
  for (var x of forma.elements) {
    if (x.dataset.proveedor) { // select input type radio 
    evaluarProveedor(x, ruta);
    }
  }
});

function evaluarProveedor(x, ruta) {
  if (x.dataset.proveedor != 'Local') {
    fs.stat(homepath + path.sep + x.dataset.proveedor, (err, stats) => { //stats is fs.Stats object
      if (err) {
        console.log(x.dataset.proveedor + ' no instalado');
      } else {
        console.log(stats);
        x.disabled = false;
      }
    });
  }
}

document.getElementById('opcionLocal').addEventListener('click', (evt) => {
  var input = document.getElementById('inputEscondido');
  var cintillo = document.getElementById('infoRuta'); 
  input.addEventListener('change', (evt) => {
    cintillo.value = input.files[0].path;
    cintillo.style.color = 'Black';
  });
  input.click();
});

document.getElementById('preferenciaRespaldo').addEventListener('click', configuracionRespaldo);
function configuracionRespaldo() {
  var selecciones = document.getElementsByName('proveedor'); //input type radio with name='proveedor'
  var elemento = document.getElementById('inputEscondido');
  var objeto = document.getElementById('inputEscondido').files[0]; // return FileList object
  var cintillo = document.getElementById('infoRuta');
  var directorio;
  for (var x of selecciones) {
    if (x.dataset.proveedor && x.checked == true) {
      directorio = (objeto) ? objeto.path : homedrive + homepath + path.sep + x.dataset.proveedor;
      guardar(x);
      return;
    }
  }
  mensajeEstado(chrome.i18n.getMessage('mensaje_nadaseleccionado'));
  function guardar(x) {
    chrome.storage.local.set({ruta: directorio}, () => {
      if (chrome.runtime.lastError) { 
        console.log('se produjo un error'); //if error, lastError is set
      } else {
        cintillo.value = (directorio) ? directorio : homedrive + homepath + path.sep + x.dataset.proveedor;
        cintillo.style.color = 'Green'; 
        elemento.value = null; //reset files object in case further selections are made/needed
        mensajeEstado(chrome.i18n.getMessage('mensaje_preferenciagrabada'));
      }
    }); 
  }
}

document.getElementById('botonSalir').addEventListener('click', respaldarSalir);
function respaldarSalir(evt) {
  chrome.storage.local.get('ruta', (objeto) => {
    if (chrome.runtime.lastError) return console.log('se produjo un error, runtime.lastError');
    var ruta = objeto.ruta;
    if (!ruta) {
      window.alert(chrome.i18n.getMessage('popup_configurerespaldo')); 
      return nw.App.quit(); 
    }
    fs.mkdirs(ruta + carpetaidb, (err) => {
      if (err) return console.log('error al crear directorio' + err); 
      db.close();
      if (window.confirm(chrome.i18n.getMessage('popup_quieresalir') + ruta)) {
        copiarIndexedDB(datapath + carpetaidb, ruta + carpetaidb, evt.target.id);
      } else {
        abrirDB();
      }
    });
  });
}
document.getElementById('botonRestaurarDB').addEventListener('click', restaurarDB);
function restaurarDB(evt) {
  chrome.storage.local.get('ruta', (objeto) => {
    if (chrome.runtime.lastError) return console.log('se produjo un error, runtime.lastError');
    var ruta = objeto.ruta;
    if (!ruta) return window.alert(chrome.i18n.getMessage('popup_respaldonoconfigurado'));
    fs.stat(ruta + carpetaidb, (err, stats) => { //stats is fs.Stats object
      if (err) {
        window.alert(chrome.i18n.getMessage('popup_nohayrespaldo') + ruta + carpetaidb);
      } else {
        db.close();
        var texto = chrome.i18n.getMessage('popup_quiererestaurar');
        if (window.confirm(texto + ruta + ' ?')) {//It delays user so db is closed before copy function
          copiarIndexedDB(ruta + carpetaidb, datapath + carpetaidb, + evt.target.id);//It does not include the parent directory source
        } else {
          abrirDB();
        }
      }
    });
  });
}

function copiarIndexedDB(origen, destino, id) {//common function for Backup and Restore DB
  var intentos = 1;
  var intervalo = setInterval(function() {intentarCopia(origen, destino, id)}, 1000);
  function intentarCopia(origen, destino, id) {
    fs.copy(origen, destino, 
      { 
        clobber:true,  
        dereference:true,
        preserveTimestamps:false, 
        filter:filtro
      }, (err) => {//Next function trow error (some files not copied) but both directories seems to be the same
        if (err && intentos < 5) {
          intentos += 1;
        } else if (err && intentos >= 5) {
          clearInterval(intervalo);
          mensajeEstado(chrome.i18n.getMessage('mensaje_operacionfallida'));
          abrirDB();
        } else if (id == 'botonSalir') { 
          nw.App.quit();
        } else {
          clearInterval(intervalo);
          mensajeEstado(chrome.i18n.getMessage('mensaje_operacionexitosa'));
          abrirDB();
        }
    });
  }
  function filtro(elemento) {
    if (elemento.indexOf('LOCK') == -1) return true; //during copy a LOCK file is created, wich block next overwrite operations
                                                            //this copied lock file dissapear when app is closed
  }
}

