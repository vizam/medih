
var fs = require('fs-extra');
var homedrive = process.env.HOMEDRIVE; 
var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default"
var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
var winpath = "\\IndexedDB";

function panelRespaldo() {
  chrome.storage.local.get('respaldo', (objeto) => { 
    var opcion = objeto.respaldo;
    var elemento = document.getElementById('infoRespaldo'); // input type text element from formaRespaldo
    elemento.value = (opcion) ? homedrive + homepath + '\\' + opcion : chrome.i18n.getMessage('defecto_opcionnoasignada');
    elemento.style.color = (opcion) ? 'Green' : 'Red';
  });
  var forma = document.getElementById('formaRespaldo');
  for (var x of forma.elements) {
    if (x.dataset.proveedor) { // select radio buttons
      console.log(x);
      evaluarProveedor(x);
    }
  }
  function evaluarProveedor(elemento) {
    fs.stat(homepath + "\\" + elemento.dataset.proveedor, (err, stats) => { //stats is fs.Stats object
      if (err) {
        console.log(elemento.dataset.proveedor + ' no instalado');
      } else {
        console.log(stats);
        elemento.disabled = false;
      }
    });
  }
}



document.getElementById('preferenciaRespaldo').addEventListener('click', (evt) => { 
  var opciones = document.getElementsByName('respaldo');
  opciones.forEach((elemento) => { //custom function for like Array dom element
    if (elemento.checked == true) {
      chrome.storage.local.set({respaldo: elemento.dataset.proveedor}, function () {
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
