


var fs = require('fs-extra');
var path = require('path');
var homedrive = process.env.HOMEDRIVE; //"C:"
var homepath = process.env.HOMEPATH; //"C:\Users\Ito"
var datapath = nw.App.dataPath;      //"C:\Users\Ito\AppData\Local\medih\User Data\Default" here \IndexedDB is required
var carpetaidb = path.sep + "IndexedDB"; //fs.copy for directory ignore parent directory
var dominioApp = path.sep + 'chrome-extension_medihdomain_0.indexeddb.leveldb'; //custom domain settled at package.json
var archivoLog = path.sep + '000003.log'; //archive that seems to locate every db action and changes


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

document.getElementById('opcionLocal').addEventListener('click', (evt1) => {
  evt1.stopPropagation();
  var input = document.getElementById('inputEscondido');
  var cintillo = document.getElementById('infoRuta'); 
  input.addEventListener('change', (evt2) => {
    evt2.stopPropagation();
    var valor = input.files[0].path;
    var recorte = valor.slice(0, -10); // ‐10 takes /IndexedDB
    //prevent user from select \IndexedDB folder in case a backup/restore folder do exists
    //instead truncate the path 
    cintillo.value = (valor.indexOf('IndexedDB') == -1) ? valor : recorte;
    cintillo.style.color = 'Black';
  });
  input.click();
});

document.getElementById('preferenciaRespaldo').addEventListener('click', configuracionRespaldo);
function configuracionRespaldo(evt) {
  evt.stopPropagation();
  var radios = document.getElementsByName('proveedor'); //input type radio with name='proveedor'
  var elemento = document.getElementById('inputEscondido');
  var seleccion = document.getElementById('inputEscondido').files[0]; // return FileList object
  var cintillo = document.getElementById('infoRuta');
  var directorio;
  for (var x of radios) {
    if (x.dataset.proveedor && x.checked == true) {
      directorio = (seleccion && x.dataset.proveedor == 'Local') ? 
                    cintillo.value : homedrive + homepath + path.sep + x.dataset.proveedor;
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
        cintillo.value = directorio;//(directorio) ? directorio : homedrive + homepath + path.sep + x.dataset.proveedor;
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
    fs.mkdirs(ruta + carpetaidb, (err) => { // create /IndexedDB if not exists
      if (err) return console.log('error al crear directorio' + err); 
      if (window.confirm(chrome.i18n.getMessage('popup_quieresalir') + ruta)) {
        var origen;
        var destino;
        //stat functions could not trow error is first parameter has error
        //is path does not exists, result is empty object
        fs.stat(datapath + carpetaidb + dominioApp + archivoLog, (err, stats) => {
          if (err) return console.error(err);
          origen = stats;
          fs.stat(ruta + carpetaidb + dominioApp + archivoLog, (err, stats) => {
            if (err) {
              console.error(err);
              //means that even that ruta was established, there is no DB saved
              db.close();
              copiarIndexedDB(datapath + carpetaidb, ruta + carpetaidb, evt.target.id);
            } else {
              destino = stats;
              if (origen.size >= destino.size) {
                db.close();
                copiarIndexedDB(datapath + carpetaidb, ruta + carpetaidb, evt.target.id);
              } else {
                window.alert(chrome.i18n.getMessage('popup_dbmaschica'));
              }
            }
          });
        });
      }
    });
  });
}
document.getElementById('botonRestaurarDB').addEventListener('click', restaurarDB);
function restaurarDB(evt) {
  console.log('entrando al restore');
  chrome.storage.local.get('ruta', (objeto) => {
    if (chrome.runtime.lastError) return console.log('se produjo un error, runtime.lastError');
    var ruta = objeto.ruta;
    if (!ruta) return window.alert(chrome.i18n.getMessage('popup_respaldonoconfigurado'));
    var origen;
    var destino;
    fs.stat(ruta + carpetaidb + dominioApp + archivoLog, (err, stats) => { //stats is fs.Stats object
      console.log('entrando al primer stat');
      if (err) {
        window.alert(chrome.i18n.getMessage('popup_nohayrespaldo') + ruta + carpetaidb);
      } else {
        origen = stats;
        fs.stat(datapath + carpetaidb + dominioApp + archivoLog, (err, stats) => {
          if (err) return console.error(err);
          destino = stats;
          if (origen.size >= destino.size) {
            if (window.confirm(chrome.i18n.getMessage('popup_quiererestaurar') + ruta + ' ?')) {
              db.close();
              copiarIndexedDB(ruta + carpetaidb, datapath + carpetaidb, evt.target.id);
            } else {
              abrirDB();
            }
          } else {
            window.alert(chrome.i18n.getMessage('popup_respaldomaschico'));
          }
        });
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
      }, (err) => {
        if (err && intentos < 5) {
          console.error(err);
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

