# MediH EMR
Simple electronic medical record application on top of NW.js and _IndexedDB_, tested on **Windows 7**.

## Features
- Simple and lightweight application for your daily patient workout 
- General practice aimed
- Single user
- No security features to protect access to your data, further than your own pc access features.
 
##Backup implementation
At first launch, its recommended to go to **Preferences** section, and configure a backup method. Every now and then, when you exit your application clicking on the little outdoor at the bottom of your app window, a backup will be writted from its source directory:
_C:\Users\<yourusername>\AppData\Local\medih\User Data\Default\IndexedDB_. 

This **IS NOT** a synchronized operation. It takes whatever you have in your source directory, and make a copy into your target directory. As a single safety measure, the  main file size is used to allow or deny the operation, in case the application tries to overwrite your bigger (and maybe more up to date) backup with a new database (it does not take into count images, just patient data).

A new database scenario could happens due to:
- Application reinstalled
- Database got erased by user experiments with paths, or by the _Chromium_ underlying framework somehow (actual storage quota for database is 5GB, must be enough).

If such scenario happens, just configure your backup preferences, targeting the directory containing the folder **IndexedDB**, and not the folder itself. Then, For _RESTORE_ operation, same principle will apply, the source main file must be bigger than the target file.
