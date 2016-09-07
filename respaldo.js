

var fs = require('fs-extra');
var path = require('path');
var homedrive = process.env.HOMEDRIVE; //"C:"
var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default" here \IndexedDB is required
var carpetaidb = path.sep + "IndexedDB"; //fs.copy for directory ignore parent directory

function panelRespaldo() {
  chrome.storage.local.get(['proveedor', 'ruta'], (objeto) => { 
    var proveedor = objeto.proveedor;
    var ruta = objeto.ruta;
    var forma = document.getElementById('formaRespaldo');
    var cintillo = document.getElementById('infoRespaldo'); // input type text element from formaRespaldo
    if (proveedor && proveedor != 'Local') {
      cintillo.value =  homedrive + homepath + path.sep + proveedor; //: chrome.i18n.getMessage('defecto_opcionnoasignada');
      cintillo.style.color = 'Green';
    } else if (!proveedor) {
      cintillo.value =  chrome.i18n.getMessage('defecto_opcionnoasignada');
      cintillo.style.color = 'Red';
    } else {
      cintillo.value = ruta;
      cintillo.style.color = 'Green';
    }
    for (var x of forma.elements) {
      if (x.dataset.proveedor) { // select radio buttons
        evaluarProveedor(x, proveedor);
      }
    }
  });
  function evaluarProveedor(x, proveedor) {
    if (x.dataset.proveedor != 'Local') {
      fs.stat(homepath + "/" + x.dataset.proveedor, (err, stats) => { //stats is fs.Stats object
        if (err) {
          console.log(x.dataset.proveedor + ' no instalado');
        } else {
          console.log(stats);
          x.disabled = false;
          x.checked = (x.dataset.proveedor == proveedor) ? true : false;
        }
      });
    } else {
      x.checked = (x.dataset.proveedor == proveedor) ? true : false;
    }
  }
}

document.getElementById('botonLocal').addEventListener('click', (evt) => {
  var input = document.getElementById('inputEscondido');
  var cintillo = document.getElementById('infoRespaldo'); 
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
  var cintillo = document.getElementById('infoRespaldo');
  var directorio;
  for (var x of selecciones) {
    if (x.dataset.proveedor && x.checked == true) {
      directorio = (objeto) ? objeto.path : homedrive + homepath + x.dataset.proveedor;
      guardar(x);
      return;
    }
  }
  mensajeEstado(chrome.i18n.getMessage('mensaje_nadaseleccionado'));
  function guardar(x) {
    chrome.storage.local.set({proveedor: x.dataset.proveedor, ruta: directorio}, () => {
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

document.getElementById('botonRespaldar').addEventListener('click', (evt) => {
  fs.mkdirs(homepath + carpetaidb, (err) => {
    if (err) {
      console.log('error al crear directorio');
      console.error(err);
      return;
    }
    console.log('Success creating/checking directory');
    chrome.storage.local.get('ruta', (objeto) => {
      if (chrome.runtime.lastError) {
        console.log('se produjo un error, runtime.lastError');
      } else {
        var ruta = objeto.ruta;
        fs.copy(datapath + carpetaidb, ruta + carpetaidb, //It does not include the parent directory source
          { clobber:true,  
            dereference:true,
            preserveTimestamps:false, 
            filter:filtro
          }, (err) => {//Next function trow error (some files not copied) but both directories seems to be the same
              if (err) return console.error(err);
              console.log('copia exitosa');
        });
      }
    });
  });
  // For sudden filter needs
  function filtro() {
    return true;
  }
});

panelRespaldo();
