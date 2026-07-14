-- Roll back the Asian Deli Go SEO metadata and image-alt follow-up (2026-07-14).
BEGIN;

UPDATE products
SET meta_title = NULL, meta_description = NULL
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = 'c71319d6-ee7e-4c9a-a0d9-405b5a88f2aa'
  AND meta_title = 'SEMPIO Seasoned Laver / Gim Jaban 70 g | Asian Deli Go';

UPDATE products
SET meta_title = NULL, meta_description = NULL
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = '1a939d8e-aa13-45e1-8419-5aeb2b20238b'
  AND meta_title = 'Papryka Gochugaru / Red Pepper Powder 500 g – OURHOME';

UPDATE product_translations
SET meta_title = 'SEMPIO Seasoned Laver / Gim Jaban 70g',
    meta_description = 'SEMPIO Seasoned Laver / Gim Jaban 70g'
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = 'a282289f-0615-409f-be16-766f324c4bbe'
  AND meta_title = 'SEMPIO Seasoned Laver / Gim Jaban 70 g | Asian Deli Go';

UPDATE product_translations
SET meta_title = 'Gochugaru / Red Pepper Powder 500g - OURHOME',
    meta_description = 'OURHOME Gochugaru red pepper powder 500g, ideal for kimchi and Korean dishes.'
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = '64ee43f7-6e9b-4efd-9146-d73aa68254fb'
  AND meta_title = 'OURHOME Gochugaru Red Pepper Powder 500 g | Asian Deli Go';

UPDATE product_images
SET alt_text = NULL
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = '4e6f59a4-65b7-44e4-932e-98faae3f82a0'
  AND alt_text = 'Opakowanie SEMPIO Seasoned Laver / Gim Jaban 70 g';

UPDATE product_images
SET alt_text = NULL
WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'
  AND id = '0f383a39-8a73-49c0-bf1a-f8b6ab756150'
  AND alt_text = 'Opakowanie OURHOME Papryka Gochugaru / Red Pepper Powder 500 g';

COMMIT;
