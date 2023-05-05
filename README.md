# Sampler Editor Librarian
An editor librarian for Akai Samplers S2800/S3000/S3200


## Build

### For developers with ssh access
```bash
$ git clone --recurse-submodules -j2 git@github.com:khremeviuc1004/sampler-editor-librarian.$ npm run build_all_on_linux
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