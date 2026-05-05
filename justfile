package:
    npm run package

test:
    npm run test

lint:
    npm run lint

fix:
    npm run lint -- --fix

format:
    npx prettier --write "src/**/*.ts"

install-antigravity:
    antigravity --install-extension ./fileclrk-0.0.3.vsix