
var fs = require('fs-extra');
var homedrive = process.env.HOMEDRIVE; 
var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default"
var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
var winpath = "\\IndexedDB";

function panelRespaldo() {
  chrome.storage.local.get(['proveedor', 'path'], (objeto) => { 
    var proveedor = objeto.proveedor;
    var path = objeto.path;
    var forma = document.getElementById('formaRespaldo');
    var cintillo = document.getElementById('infoRespaldo'); // input type text element from formaRespaldo
    if (proveedor && proveedor != 'Local') {
      cintillo.value =  homedrive + homepath + '\\' + proveedor; //: chrome.i18n.getMessage('defecto_opcionnoasignada');
      cintillo.style.color = 'Green';
    } else if (!proveedor) {
      cintillo.value =  chrome.i18n.getMessage('defecto_opcionnoasignada');
      cintillo.style.color = 'Red';
    } else {
      cintillo.value = path;
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
      fs.stat(homepath + "\\" + x.dataset.proveedor, (err, stats) => { //stats is fs.Stats object
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
  var selector = document.getElementById('dialogoEscondido');
  var cintillo = document.getElementById('infoRespaldo'); 
  selector.addEventListener('change', (evt) => {
    if (chrome.runtime.lastError) return;
      console.log(selector.files); //this files object only has one key/value, value is another object with properties
      chrome.storage.local.set({path: selector.files[0].path}, () => {   //function is optional, nothing passed, 
        if (chrome.runtime.lastError) {
          console.log('se produjo un error');//  if error, chrome.runtime.lastError is set
        } else {
          cintillo.value = selector.files[0].path;
          cintillo.style.color = 'Black';
        }
      });
  });
  selector.click();
});

document.getElementById('preferenciaRespaldo').addEventListener('click', (evt) => { 
  var opciones = document.getElementsByName('proveedor');
  opciones.forEach((elemento) => { //custom function for like Array dom element
    if (elemento.checked == true) {
      chrome.storage.local.set({proveedor: elemento.dataset.proveedor}, function () {
        mensajeEstado(chrome.i18n.getMessage('mensaje_preferenciagrabada'));
      });
      panelRespaldo();
      return;
    } 
    mensajeEstado(chrome.i18n.getMessage('mensaje_nadaseleccionado'));
  })
})
document.getElementById('botonRespaldar').addEventListener('click', (evt) => {
  fs.mkdirs(homepath + winpath, (err) => {
    if (err) console.error(err);
    console.log('Success');
  });
  // Next function trow error (some files not copied) but both directories seems to be the same
  fs.copy(datapath + winpath, homepath + winpath, { clobber:true,  //It does not include the parent directory source
                                dereference:true,
                                preserveTimestamps:false, 
                                filter:filtro
                              }, (err) => {
                                if (err) console.error(err);
                              });
  // For sudden filter needs
  function filtro() {
    return true;
  }
});

panelRespaldo();
