Place a local India pincode CSV here as `india_pincodes.csv` or set `PINCODE_DIRECTORY_CSV` in `back-end/.env`.

Expected columns can be any close variant of:
- `pincode`
- `office_name`
- `district`
- `state`

The backend will use this local directory as a fallback when the public India Post API returns incomplete results for valid pincodes.
