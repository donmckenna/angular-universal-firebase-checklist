## Angular Universal / Firebase Functions Checklist

#### Motivation
Made this as a checklist for myself to remember all the intricate bits of getting Angular Universal to work on a Firebase Hosting server through a Firebase Cloud Function, but I can only assume someone else in the world will be trying to implement their own similar functionality, so here we are.


#### Disclaimer
I take no responsibility if anyone uses this checklist and subsequently screws up their own life. These settings and directories work for my use but there is no guarantee they will work for yours. This is by no means meant to be a comprehensive tutorial, but I hope it can at least bring some pieces together and help someone else not age more rapidly than absolutely necessary.  

  - **Notes:**
    - Based on / works with Angular 7 and Windows
    - Please replace all instances of `YOUR_PROJECT_NAME` with your actual project name.  
      This can be found in your root `package.json` in the `"name"` field.  
      It should be the name you chose for your project when first setting up with `ng new`

<br>
<a id="ng-generate-universal"></a>

#### Generate Universal files 
- In an existing Angular CLI project:  
`ng generate universal --client-project YOUR_PROJECT_NAME`    
<br>


#### Setup Firebase

##### Install Firebase Tools
- If not already installed:  
  `npm i -g firebase-tools`  
- Close your terminal and reopen it.
- Check version with `firebase --version` and compare with the [current version on npm](https://www.npmjs.com/package/firebase-tools)  
After installing, if the versions don't match, or your version isn't current / hasn't changed, [double check your installation(s) for these potential issues](#troubleshooting-firebase-tools)

##### Initialize Firebase
- In your project root:  
  `firebase init`  
- Select both `Functions` and `Hosting` with `[spacebar]`
- Choose an existing project if you have one.
- **Functions Setup**
  - Choose `TypeScript`. The functions we'll include later are `.ts` files.
  - `n` to skip using TSLint as it's not imperative right now.
  - `n` to skip installing dependencies as we'll have to install more anyway.
- <a id="firebase-hosting-setup"></a>
**Hosting Setup**
  - Change your public directory to `dist`  
  [( you can change this later in `firebase.json` )](#firebase-json-hosting-public)
  - `y` to configure single-page app
- Firebase should now have created/populated [`firebase.json`](#firebase-json) and created a `/functions` folder in the root directory with some stuff in it.  
- It should also have included `firebase-admin` and `firebase-functions` as dependencies in the `package.json` of this new `/functions` folder.

    
<br>

#### Install additional dependencies

    @nguniversal/express-engine
    @nguniversal/module-map-ngfactory-loader
    
- These dependencies can be installed in your project root. We will also include them in `/functions/package.json` later, but don't worry about that now.
- In your project root:  
`npm i -S @nguniversal/express-engine @nguniversal/module-map-ngfactory-loader`  
**or**  
`yarn add @nguniversal/express-engine @nguniversal/module-map-ngfactory-loader`  
<br>


#### Copy dependencies to `functions/package.json`

- The Firebase Hosting server needs all the dependencies we used for our client app to properly render our server-side bundle files.
- Copy all `dependencies` and `devDependencies` from your root `package.json` to `/functions/package.json`
- Now we can install the function / server dependencies:
  - If in the project root folder, navigate to the `/functions` folder:  
    ```
    cd functions
    npm install
    ```
<br>


#### Change a few lines

- `angular.json`  
  - `projects.YOUR_PROJECT_NAME.architect.build.options.outputPath`  
    change to `"dist"`

  - `projects.YOUR_PROJECT_NAME.architect.server.options.outputPath`  
    change to `"functions/lib"`

<br>

- <a id="firebase-json"></a>
`firebase.json`  
  - `functions.predeploy`  
  (sometimes the internet recommends more fields, but this seems to work on its own)  
  (for Windows) make sure it reads:  
      ```
      "functions": {
        "predeploy": "npm --prefix \"$RESOURCE_DIR\" run build"
      },
      ```
    [Alternative ways of writing `\"$RESOURCE_DIR\"` can be found here](#troubleshooting-resource-dir) if your `predeploy` isn't firing correctly.

  <br>

  - <a id="firebase-json-hosting-public"></a>
    `hosting.public`  
    Value should be `"dist"` [(from Firebase Hosting Setup)](#firebase-hosting-setup).  
    ```
    "hosting": {
      "public": "dist"
    }
    ```
    <br>

  - <a id="firebase-json-rewrites"></a>
    `rewrites`  
    Firebase defaults to pointing page requests to your hosting landing page, `/index.html`  
    However, we want to intercept the request with a `"function"` instead of a `"destination"` so Firebase knows about our Angular Universal server files.  
    Specifically, the function [we'll name `"ssrApp"` in the future.](#implement-firebase-express-function-ssrapp)

      ```
      "rewrites": [{
        "source": "**",
        "destination": "/index.html"   <---
      }]
      ```
    to
      ```
      "rewrites": [{
        "source": "**",
        "function": "ssrApp"   <--- *
      }]
      
      * (where "ssrApp" is the name of your firebase cloud function)
      ```

<br>

- <a id="functions-package-json"></a>
`functions/package.json`  
  - This is the `package.json` inside the `/functions` folder Firebase made for you.  
    Make sure `"main"` points to the compiled JavaScript file we'll be rendering to `/functions/lib` :  
    ```
    "main": "lib/index.js"
    ```
<br>

- `app.server.module.ts`
    - Angular creates this file for you when you [`ng generate` a new Universal project](#ng-generate-universal).  
      If we want to use lazy loading, we need to import the `ModuleMapLoaderModule` :  
      <br>**The new bits:**
      ```
      import { ModuleMapLoaderModule } from '@nguniversal/module-map-ngfactory-loader';   <---

      @NgModule({
        imports: [ ModuleMapLoaderModule ]   <---
      })
      ```
      **The new bits alongside the existing bits:**  
      ```
      import { NgModule } from '@angular/core';
      import { ServerModule } from '@angular/platform-server';
      import { ModuleMapLoaderModule } from '@nguniversal/module-map-ngfactory-loader';   <---

      import { AppModule } from './app.module';
      import { AppComponent } from './app.component';

      @NgModule({
        imports: [
          AppModule,
          ServerModule,
          ModuleMapLoaderModule   <---
        ],
        bootstrap: [AppComponent],
      })
      export class AppServerModule {}
      ```
<br>



#### Implement Firebase Express Cloud Function

- Some have implemented this step with an npm package, however the code is tolerable enough to include in a few files, so we'll just do that.  
  <!-- Further explanation of this step / chunk / process here.   -->
- Copy the `/universal` folder from `/functions/src` in this repository to your local `/functions/src`.  
  
  **Also note:** The code in these `.ts` files works in Windows and uses `path.join(__dirname, ..)` to point the object passed into `angularUniversal.trigger()` to the correct `index`, `main` and `staticDirectory` files.

- <a id="implement-firebase-express-function-ssrapp"></a> 
  Replace the contents of the `/functions/src/index.ts` file Firebase made for you, with:
  ```
  import universal from './universal/server-function';
  export const ssrApp = universal;
  ```
- Note the `export const ssrApp` which is the [same function name we defined in the `firebase.json` `rewrites`](#firebase-json-rewrites)

<br>


#### Angular build scripts

##### Initial understanding

- We've set our app up to expect and accept the files we will create with these build scripts.  
We'll go through each command separately, which will give us a better idea of what is going on with the final `build-and-deploy` script.  

- First, we'll build our normal Angular app in production mode:  
  ```
  ng build --prod
  ```
- Then we'll create the server bundle from the completed production bundle:  
  ```
  ng run YOUR_PROJECT_NAME:server:production
  ```
- An `index.html` file will be created in your client production `dist` folder.  
  Firebase will first look for an `index.html`, and only run  our `ssrApp` Cloud Function if `index.html` is not found.  
  However, we do need some sort of `index` file for our server bundle, so we can safely take the newly created `index.html` file in the `/dist` folder and move it to our server rendered folder, `/functions/lib`.  
  Additionally, we'll rename this moved file to reflect the `index` parameter of the Firebase config object we're using in `/functions/src/universal/server-function.ts` which we've name `index-server.html`

  On Windows, this command looks like this:  
  ```
  move dist\\index.html functions\\lib\\index-server.html
  ```
- Once our builds are finished and `index` files are in their correct places, we can finally deploy our app to Firebase Hosting and our `express` function to Firebase Cloud Functions:  
  ```
  firebase deploy
  ```

##### Streamlining future builds

- If we wish to run a build again, we'll have to delete the production build files we rendered in `/dist` and `/functions/lib` before creating new ones.  
  The first step in creating a new build is to clean up the old build.  
  We'll remove both folders at once. On Windows we can use `rmdir` with `/S` to remove entire directory trees, and `/Q` to not ask questions.  
  In your root `package.json` in the `scripts` object:
  ```
  rmdir /S /Q dist && rmdir /S /Q functions\\lib
  ```

- We can group the creation of our client and server bundles, removal of old bundles and index file moving into a few commands:  
  ```
  "build:client-and-server-bundles": "ng build --prod && ng run YOUR_PROJECT_NAME:server:production",
  "move-index": "move dist\\index.html functions\\lib\\index-server.html",
  ```

- And then we can group these commands into a final command which cleans out old bundles, compiles new ones, moves appropriate files and ultimately deploys the finshed files and `express` Cloud Function:
  ```
  "build-and-deploy": "rmdir /S /Q dist && rmdir /S /Q functions\\lib && npm run build:client-and-server-bundles && npm run move-index && firebase deploy"
  ```

- Your CLI will do some things and in the end Firebase should tell you `Deploy complete` at which point you can stop holding your breath and go get a drink. Hurrah.



<br><br>
<hr>
<br>


#### Troubleshooting Issues

- <a id="troubleshooting-firebase-tools"></a>
`firebase-tools` does not update / install new versions.
  - Close your terminal and reopen it. Sometimes this is all it takes.
  - `firebase-tools` must be installed globally. Make sure it is not installed in your project directory.
  - Try updating with `npm update -g firebase-tools`.
  - Try updating to a specific version with something like `npm install -g firebase-tools@6.11.0`
  - Did you previously install `firebase-tools` with `yarn global add`, and are now trying to update with npm (or vice versa)? Make sure to remove any straggling installations in your local project or globally with `npm uninstall -g firebase-tools` and/or `yarn global remove firebase-tools`.

- <a id="troubleshooting-resource-dir"></a>
`$RESOURCE_DIR` isn't found / Firebase `functions.predeploy` isn't firing correctly.
  - Try writing `$RESOURCE_DIR` like this:  
  `\"$RESOURCE_DIR\"`  
  `%$RESOURCE_DIR%`  
  `$RESOURCE_DIR`  
  `functions`  
    - ^ aka the hard-coded `functions` folder itself 
    



<br><br>
<hr>
<br>


#### Resources
There are a lot of hard-working, smart people on the internet with buckets of knowledge to tap into. This "checklist" is not derived from any single resource, but there are a few key resources I used to widen my understanding on the subject.  

Some resources are free, others require payment to deliver a complete package. I've personally paid for some of these resources, do not regret it, and have much respect for the individuals teaching these concepts in depth.

- [`angular-university.io`](https://angular-university.io/)  
  [Angular University Course](https://angular-university.io/course/angular-universal-course)
  - Vasco is a knowlegeable and detailed teacher. There are a few outdated pieces to this course, but such is web development, and I regularly reference this course to refresh my understanding.  
<br>  
- [`fireship.io`](https://fireship.io)  
  [Angular Universal SSR with Firebase ](https://fireship.io/lessons/angular-universal-firebase/)
  - Jeff wonderfully packs large concepts into easily digestible bits. His lessons and clarifications have been invaluable to making sense of this "stack".  
<br>  
- `Github heros`  
  - There are a mess of random Github issue comments which have helped immensely, however they are strewn about hundreds of browser tabs. I will list them when I find them again.