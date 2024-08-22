[![Node.js CI](https://github.com/khremeviuc1004/sampler-editor-librarian/actions/workflows/node.js.yml/badge.svg)](https://github.com/khremeviuc1004/sampler-editor-librarian/actions/workflows/node.js.yml)

# Sampler Editor Librarian
An editor librarian for Akai Samplers S2800/S3000/S3200


## Build

### For developers with ssh access
```bash
$ git clone --recurse-submodules -j2 git@github.com:khremeviuc1004/sampler-editor-librarian.
$ npm run build_all_on_linux
$ pkg --debug -c ./package.json ./dist/main.js
```

### For everyone else
```bash
$ git clone https://github.com/khremeviuc1004/sampler-editor-librarian.git
$ cd sampler-editor-librarian
$ git submodule init
$ vim .git/config # change submodule repo URLs to https not ssh - refer below
$ git submodule update
$ npm run build_all_on_linux
$ pkg --debug -c ./package.json ./dist/main.js
```

.git/config before
```
[submodule "modules/sampler-editor-librarian-client"]
        active = true
        url = git@github.com:khremeviuc1004/sampler-editor-librarian-client.git
[submodule "modules/sampler-editor-librarian-dto"]
        active = true
        url = git@github.com:khremeviuc1004/sampler-editor-librarian-dto.git`
```


.git/config after
```
[submodule "modules/sampler-editor-librarian-client"]
        active = true
        url = https://github.com/khremeviuc1004/sampler-editor-librarian-client.git
[submodule "modules/sampler-editor-librarian-dto"]
        active = true
        url = https://github.com/khremeviuc1004/sampler-editor-librarian-dto.git`
```

### Running from git clone
```bash
$ cd <base path to cloned git repo>/sampler-editor-librarian
$ npm run start:debug
```


## Running

```bash
$ ./sampler-editor-librarian-<platform>
```

Open http://localhost:4000 in a browser, select midi input and output connections to the sampler and then navigate using the View/Sampler menu.


```
Original S3200 sysex page here: http://web.archive.org/web/20010203002600/http://akaipro.com/ref-S3000SysEx.html

F0 47 00 34 48 00 00 01 00 00 01 00 00 00 F7 - select floppy drive
F0 47 00 34 48 00 00 01 00 00 01 00 01 00 F7 - select hard drive

F0 47 00 33 48 01 00 01 00 00 01 00 F7 - get the number of partitions on the currently selected hard drive
F0 47 00 33 48 02 00 01 00 00 01 00 F7 - get the selected partition
F0 47 00 34 48 02 00 01 00 00 01 00 00 00 F7 - select partition A
F0 47 00 34 48 02 00 01 00 00 01 00 01 00 F7 - select partition B

F0 47 00 33 48 03 00 01 00 00 01 00 F7 - get the number of volumes in the currently selected partition
F0 47 00 33 48 04 00 01 00 00 01 00 F7 - get the selected volume
F0 47 00 34 48 04 00 01 00 00 01 00 00 00 F7 - select volume 1
F0 47 00 34 48 04 00 01 00 00 01 00 01 00 F7 - select volume 2

F0 47 00 34 48 06 00 01 00 00 01 00 00 00 F7 - load from current volume - entire volume
F0 47 00 34 48 06 00 01 00 00 01 00 01 00 F7 - load from current volume - all progs and samples
F0 47 00 34 48 06 00 01 00 00 01 00 02 00 F7 - load from current volume - all progs
F0 47 00 34 48 06 00 01 00 00 01 00 03 00 F7 - load from current volume - all samples
F0 47 00 34 48 06 00 01 00 00 01 00 04 00 F7 - load from current volume - cursor progs and samples
F0 47 00 34 48 06 00 01 00 00 01 00 05 00 F7 - load from current volume - cursor item only
F0 47 00 34 48 06 00 01 00 00 01 00 06 00 F7 - load from current volume - operating system

F0 47 00 34 48 07 00 01 00 00 01 00 00 00 F7 - clear memory and load from current volume - entire volume
F0 47 00 34 48 07 00 01 00 00 01 00 01 00 F7 - clear memory and load from current volume - all progs and samples
F0 47 00 34 48 07 00 01 00 00 01 00 02 00 F7 - clear memory and load from current volume - all progs
F0 47 00 34 48 07 00 01 00 00 01 00 03 00 F7 - clear memory and load from current volume - all samples
F0 47 00 34 48 07 00 01 00 00 01 00 04 00 F7 - clear memory and load from current volume - cursor progs and samples
F0 47 00 34 48 07 00 01 00 00 01 00 05 00 F7 - clear memory and load from current volume - cursor item only
F0 47 00 34 48 07 00 01 00 00 01 00 06 00 F7 - clear memory and load from current volume - operating system

F0 47 00 34 48 08 00 01 00 00 01 00 00 00 F7 - save memory to current volume - entire vol
F0 47 00 34 48 08 00 01 00 00 01 00 01 00 F7 - save memory to current volume - all progs and samples
F0 47 00 34 48 08 00 01 00 00 01 00 02 00 F7 - save memory to current volume - all progs
F0 47 00 34 48 08 00 01 00 00 01 00 03 00 F7 - save memory to current volume - all samples
F0 47 00 34 48 08 00 01 00 00 01 00 04 00 F7 - save memory to current volume - cursor progs and samples
F0 47 00 34 48 08 00 01 00 00 01 00 05 00 F7 - save memory to current volume - cursor item only
F0 47 00 34 48 08 00 01 00 00 01 00 06 00 F7 - save memory to current volume - operating system

F0 47 00 34 48 09 00 01 00 00 01 00 00 00 F7 - clear current volume and save memory to it - clears volume - entire vol
F0 47 00 34 48 09 00 01 00 00 01 00 01 00 F7 - clear current volume and save memory to it - clears volume - all progs and samples
F0 47 00 34 48 09 00 01 00 00 01 00 02 00 F7 - clear current volume and save memory to it - clears volume - all progs
F0 47 00 34 48 09 00 01 00 00 01 00 03 00 F7 - clear current volume and save memory to it - clears volume - all samples
F0 47 00 34 48 09 00 01 00 00 01 00 04 00 F7 - clear current volume and save memory to it - clears volume - cursor progs and samples
F0 47 00 34 48 09 00 01 00 00 01 00 05 00 F7 - clear current volume and save memory to it - clears volume - cursor item only
F0 47 00 34 48 09 00 01 00 00 01 00 06 00 F7 - clear current volume and save memory to it - clears volume - operating system

F0 47 00 34 48 0A 00 01 00 00 01 00 00 00 F7 - Delete in selected volume - CURSOR ITEM ONLY
F0 47 00 34 48 0A 00 01 00 00 01 00 01 00 F7 - Delete in selected volume - ALL PROGRAMS ONLY
F0 47 00 34 48 0A 00 01 00 00 01 00 02 00 F7 - Delete in selected volume - ALL SAMPLES
F0 47 00 34 48 0A 00 01 00 00 01 00 03 00 F7 - Delete in selected volume - ENTIRE VOLUME
F0 47 00 34 48 0A 00 01 00 00 01 00 04 00 F7 - Delete in selected volume - OPERATING SYSTEM

F0 47 00 34 48 31 00 01 00 00 01 00 04 00 F7 - Cursor - doesn't seem to work


how to position the cursor on the volume screen in a sysex?

F0 47 00 34 48 00 00 00 00 00 00 00 F7 - showall
F0 47 00 34 48 01 00 00 00 00 00 00 F7 - BTSORT


F0 47 00 34 48 01 00 06 00 00 0C 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 F7 - rename drum file name in memory
F0 47 00 34 48 06 00 06 00 00 0C 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 09 00 F7 - rename currently selected volume - doesn't seem to work

```

```
Akai Disk Format

https://lsnl.jp/~ohsaki/software/akaitools/S3000-format.html
```