/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {GoogleDrive} from "./GoogleDrive";

/*
 * Use the Google Developers Console to generate an
 * OAuth client ID for web application.
 * This key will be restricted to the domain where the
 * web application is hosted.
 */
GoogleDrive.clientId = "Your OAuth client Id";

/*
 * Use the Google Developers Console to generate a
 * developer key for browser applications.
 * This key will be restricted to the domain where the
 * web application is hosted.
 */
GoogleDrive.apiKey = "Your developer API key";
