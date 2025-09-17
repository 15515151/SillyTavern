#!/usr/bin/env bash

# Make sure pwd is the directory of the script
cd "$(dirname "$0")"

if ! command -v npm &> /dev/null
then
    read -p "npm is not installed. Do you want to install nodejs and npm? (y/n)" choice
    case "$choice" in
      y|Y )
        echo "Installing nvm..."
        export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        source ~/.bashrc
        nvm install --lts
        nvm use --lts;;
      n|N )
        echo "Nodejs and npm will not be installed."
        exit;;
      * )
        echo "Invalid option. Nodejs and npm will not be installed."
        exit;;
    esac
fi

# 检查是否需要安装依赖
NEED_INSTALL=false

if [ ! -d "node_modules" ]; then
    NEED_INSTALL=true
    echo "node_modules directory not found."
elif [ ! -f "package-lock.json" ]; then
    NEED_INSTALL=true
    echo "package-lock.json not found."
elif [ "package.json" -nt "package-lock.json" ]; then
    NEED_INSTALL=true
    echo "package.json is newer than package-lock.json."
elif [ "package-lock.json" -nt "node_modules" ]; then
    NEED_INSTALL=true
    echo "package-lock.json is newer than node_modules."
fi

if [ "$NEED_INSTALL" = true ]; then
    echo "Installing/Updating Node Modules..."
    export NODE_ENV=production
    npm i --no-audit --no-fund --loglevel=error --no-progress --omit=dev
else
    echo "Dependencies are up to date, skipping npm install."
fi

echo "Entering SillyTavern..."
node --max-old-space-size=14336 "server.js" "$@"
