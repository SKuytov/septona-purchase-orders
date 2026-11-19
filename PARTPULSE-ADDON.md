# Optional PartPulse supplier lookup addon

## Boundary
Only new files in the Septona repository are added. No PartPUlse-ORD files, routes, database records, schema, server settings or authentication settings are changed. The addon sends GET /api/suppliers only. It never creates suppliers, orders or approvals. Editing the PDF draft does not update PartPulse.

## Deploy
1. Export any open purchase-order draft before deployment.
2. Copy the complete Septona app into a NEW dedicated directory under the frontend directory already served by PartPulse, e.g. frontend/purchase-orders/. Do not replace the main production frontend/index.html or frontend/app.js. Verify the actual served frontend location on your VM first; do not assume a filesystem path from these examples.
3. Keep the app files, company-defaults.js and assets together. Add connected.html and supplier-lookup.js in that same addon directory. Existing Septona files are unchanged by this commit.
4. Log in to the existing PartPulse application using an admin/procurement account. Then visit /purchase-orders/connected.html on the EXACT SAME origin (scheme, hostname and port). Use the Funnel hostname for both pages, or the private Tailscale address for both; tokens are not shared between those origins.
5. Type at least two supplier-name characters. Select a suggestion, then edit the draft as needed.
6. The original /purchase-orders/index.html remains the standalone editor without lookup.

No PHP, database credentials, MySQL exposure, new service, reverse-proxy rule, production restart or database migration is intended. Deployment depends on the actual server already serving this frontend directory and supporting this new static path. If your deployment differs, inspect its static-file routing before proceeding.

## Lookup limitations
The existing production endpoint returns ALL active supplier records. Without changing it, this addon fetches that list after a 300 ms typing pause and filters supplier names in the browser, showing at most 10 results. This is live API-backed autocomplete, not server-side search or pagination. There is no persistent supplier cache. Large directories may make it inefficient; improving that would require a separately approved backend change. The response may include fields beyond those shown because that is the existing API contract.

The API's existing admin/procurement authorization is retained. The addon reads the existing authToken from same-origin localStorage but does not write, replace or remove it. No tokens, credentials or supplier records are committed to GitHub or included in exported drafts by this addon. Missing/expired login, forbidden access, blocked storage, invalid API responses and network failures leave manual entry available. A token change in another tab clears search results. All same-origin JavaScript shares the site's trust boundary; a separate folder or iframe is NOT security isolation. The existing bearer token has its existing role permissions even though this addon only makes GET requests.

Selecting a new supplier replaces name/address/contact/email only after a warning if contact details already exist; missing values clear those fields so data from different suppliers is not mixed. Supplier phone is not mapped because the existing editor has no supplier-phone field. All mapped fields stay editable. The page uses an iframe to load the existing editor unchanged and attaches the optional script only to that editor. Print/PDF remains the editor's existing print action.

## Acceptance tests before production use
- Confirm existing PartPulse pages and login still work.
- Open the addon on the same origin after logging in; select a known supplier and check all four mapped fields.
- Edit the filled fields and export/reimport a draft. Confirm no PartPulse supplier record changed.
- Try an unknown supplier and manual entry.
- Try logout, expired token, requester account and offline mode; verify no lookup data is shown without a successful authorized response and manual entry remains available.
- Verify cancelled replacement preserves the form, and reset/import clears old suggestion buttons.
- Inspect Network: addon traffic must be GET /api/suppliers, with no POST/PUT/PATCH/DELETE.
- Test PDF output and ensure lookup controls do not print.

This addon has been source-reviewed but has NOT been browser-tested against your live authenticated deployment. Validate on a staging copy or a dedicated addon folder before operational use. Reading suppliers invokes the production API and may appear in infrastructure access logs; no zero-impact guarantee is implied.

## Rollback
Remove only the new purchase-orders directory you created. Do not remove the main frontend directory. No database rollback is needed. GitHub publication is not deployment to the VM.
