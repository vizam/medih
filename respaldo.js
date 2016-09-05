
function respaldo() {
  var fs = require('fs-extra');
  var ruta = process.env.HOMEPATH;
  var forma = document.getElementById('formaRespaldo');
  var opcion;
  chrome.storage.local.get('respaldo', (objeto) => {
    opcion = objeto.respaldo;
    console.log(opcion);
  });
  for (var x of  forma.elements) {
    if (x.dataset.proveedor) {
      activarProveedor(x.dataset.proveedor, x);
    }
  }
  function activarProveedor(string, objeto) {
    fs.stat(ruta + "//" + string, (err) => {
      if (err) {
        console.log(string + ' no instalado');
      } else {
        objeto.disabled = false;
      }
    });
  }
  
  document.getElementById('preferenciaRespaldo').addEventListener('click', (evt) => { 
    var opciones = document.getElementsByName('respaldo');
    opciones.forEach((elemento) => { //custom function for like Array dom element
      if (elemento.checked == true) {
        chrome.storage.local.set({respaldo: elemento.dataset.proveedor}, function () {
          mensajeEstado(chrome.i18n.getMessage('mensaje_preferenciagrabada'));
        });
        return;
      } 
      mensajeEstado(chrome.i18n.getMessage('mensaje_nadaseleccionado'));
    })
  })
  document.getElementById('botonRespaldar').addEventListener('click', (evt) => {
    var fs = require('fs-extra');
    var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default"
    var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
    var winpath = "\\IndexedDB";
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
}

respaldo();
