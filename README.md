# Septona Purchase Order Generator

Self-contained static application. No database, PHP, Node installation, CDN, tracking, API keys or build step is needed to run it. The supplied Septona logo is included locally.

## Install on SuperHosting
1. Extract the ZIP.
2. Upload the CONTENTS of the septona-purchase-orders directory to a dedicated folder, for example public_html/purchase-orders/, using cPanel File Manager or FTP.
3. Keep index.html, app.js, style.css and the assets folder together.
4. Open that folder URL over HTTPS. Do not overwrite an existing website index.html: use a dedicated subfolder.
5. Optionally restrict access using your hosting control panel's directory password protection.

## Use
1. Enter your internal order ID and supplier quotation reference.
2. Complete buyer registered address, VAT ID, contact and ship-to address. They are intentionally blank rather than guessed.
3. Enter supplier and line items. Add further items as needed.
4. Set payment, delivery, freight, discount and VAT explicitly. VAT defaults to 0 and is not calculated based on jurisdiction. Freight is taxed at the same entered rate as items. Discounts reduce the taxable base; the base is floored at zero. This is not a tax engine.
5. Choose English or Bulgarian document labels. Entered descriptions and commercial terms are not automatically translated.
6. Keep DRAFT while reviewing. To remove the draft marking, select Issued and enter the prepared/approved-by name. This is a manual label, not authentication, approval verification or a digital signature.
7. Click Print / Save PDF. Select Save as PDF in your browser, A4 paper, 100% scale, disable browser headers/footers. This app uses the browser print engine, not a one-click PDF download library. Print settings and pagination may vary by browser. Check the generated PDF before sending it.
8. Save draft exports a private JSON file. Import draft reopens it. There is no automatic save. Closing or refreshing the tab loses changes not exported.

## Order #3989
The dedicated button loads only details supplied in this conversation: two AE 3301 units, supplier contact and the second unit's indicated 2–3-week readiness. No prices or quotation reference have been inferred. Confirm those and complete commercial terms before issuing. The sample button places these supplied details in app.js: remove that handler and its button BEFORE publishing this package in a public repository if you do not want the supplier/order details visible. This package has not been pushed to GitHub.

## Privacy and security
All editing and PDF printing happen locally in the browser. No external libraries, fonts, telemetry or services are loaded by the application. The hosting provider still receives ordinary page requests and may keep access logs. JSON/PDF exports are not encrypted. Import accepts only known fields and displays text using textContent. This is not a shared procurement database, an authenticated approval workflow or an accounting system. Restrict the hosted folder as appropriate. The Septona logo remains its owner's property; no trademark licence is implied.

## Files
- index.html: application interface
- style.css: responsive editor and A4 print layout
- app.js: draft editor, validation, calculation, preview and browser printing
- assets/septona-logo.jpg: user-supplied logo
- README.md: setup and limitations

## Verification status
ZIP integrity and required-file presence were checked during packaging. Automated browser, JavaScript-runtime and PDF-pagination tests were NOT available for this rebuilt package. Test printing a short and a multi-page order in your intended browser before using it operationally. Review amounts, supplier details and terms before sending any document.
