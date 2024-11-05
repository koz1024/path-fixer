# Path fixer

```json
  "compilerOptions": {
    "module": "es2020",
    "target": "es2020"
  }
```
– and imports do not work?

Install:

```shell
npm i --save-dev @koz1024/path-fixer
```

and run: 
```shell
npx path-fixer
```

```shell
npx path-fixer -c tsconfig.json # to specify tsconfig file
npx path-fixer -d path/to/build # to specify build directory
```

```shell
```
