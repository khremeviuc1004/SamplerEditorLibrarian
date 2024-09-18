FROM debian AS build

WORKDIR /root
RUN apt update
RUN apt -y install curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
RUN . /root/.bashrc && nvm install 21
RUN apt -y install git
RUN git clone https://github.com/khremeviuc1004/sampler-editor-librarian.git
WORKDIR /root/sampler-editor-librarian
RUN sed -e 's/git@github.com:/https:\/\/github.com\//' .gitmodules > .gitmodules2
RUN mv .gitmodules2 .gitmodules
RUN git submodule init
RUN git submodule update
RUN . /root/.bashrc && npm i -g @nestjs/cli
RUN . /root/.bashrc && npm install -g pkg
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y
WORKDIR /root/sampler-editor-librarian/modules/sampler-editor-librarian-dto
RUN . /root/.bashrc && npm i
RUN . /root/.bashrc && npm run build
WORKDIR /root/sampler-editor-librarian/modules/sampler-editor-librarian-client-angular
RUN . /root/.bashrc && npm i
RUN . /root/.bashrc && npm run build
WORKDIR /root/sampler-editor-librarian/modules/react-dial-knob
RUN . /root/.bashrc && npm --force i
RUN . /root/.bashrc && npm run build
WORKDIR /root/sampler-editor-librarian/modules/sampler-editor-librarian-client-react
RUN . /root/.bashrc && npm i
RUN . /root/.bashrc && npm run build
WORKDIR /root/sampler-editor-librarian
RUN . /root/.bashrc && npm i
RUN cp ./ui-type-angular ./src/ui-type.ts
RUN apt install -y build-essential
RUN apt install -y pkg-config
RUN apt install -y libasound2-dev
RUN . /root/.bashrc && nest build
RUN . /root/.bashrc && npm run neon:build -- --release
RUN . /root/.bashrc && pkg --debug -c ./pkg-angular.json -o sampler-editor-librarian-angular ./dist/main.js
RUN cp ./ui-type-react ./src/ui-type.ts
RUN . /root/.bashrc && nest build
RUN . /root/.bashrc && npm run neon:build -- --release
RUN . /root/.bashrc && pkg --debug -c ./pkg-react.json -o sampler-editor-librarian-react ./dist/main.js


FROM debian
RUN apt update && apt install -y libasound2-dev
COPY --from=build /root/sampler-editor-librarian/sampler-editor-librarian-angular-linux /root/
COPY --from=build /root/sampler-editor-librarian/sampler-editor-librarian-react-linux /root/
WORKDIR /root
RUN echo '#!/usr/bin/bash \n\nif [ "$UI_TYPE" = "angular" ]\nthen\n./sampler-editor-librarian-angular-linux\nelif [ "$UI_TYPE" = "react" ]\nthen\n./sampler-editor-librarian-react-linux\nfi\n' > ./entrypoint.sh
RUN chmod 755 ./sampler-editor-librarian-angular-linux ./sampler-editor-librarian-react-linux ./entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]

