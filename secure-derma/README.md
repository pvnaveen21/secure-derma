# SecureDerma

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.20.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Frontend environment configuration

This frontend reads deploy-time configuration from `public/env.js`, which is loaded as `/env.js` in the browser. The real `public/env.js` is ignored by Git and generated per environment.

Tracked template:

```js
window.__SECURE_DERMA_CONFIG__ = {
  BASEURL_API: 'https://your-api.example.com/api',
  GOOGLE_CLIENT_ID: 'your-google-oauth-client-id'
};
```

Files:

- `public/env.example.js`: commit this template
- `public/env.js`: local/generated file, do not commit

Vercel setup:

- Add `BASEURL_API` in Vercel Project Settings -> Environment Variables
- Add `GOOGLE_CLIENT_ID` in Vercel Project Settings -> Environment Variables
- The build now generates `public/env.js` automatically before `ng build`

Notes:

- `BASEURL_API` defaults to `/api` if omitted
- `GOOGLE_CLIENT_ID` is optional. If empty, Google sign-in is hidden
- These values are browser-visible, so do not put private API secrets here

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
