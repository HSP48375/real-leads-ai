-- Delete all test orders (and their associated leads)
DELETE FROM leads WHERE order_id IN (
  'f29d6725-e3ce-4a4b-8eb1-5823a14b893c',
  '01bb1f14-be01-4794-bee2-e0bcf0d91640',
  'fc0840d4-84bb-4af0-9f35-ebd364805f97',
  'a62ddecd-71c5-4d48-9c8a-d1039e11a33f',
  'd5d37e66-c3f7-4b3e-91aa-cc221ac36710',
  '3d91fecd-fab0-4411-996c-f6ec22abd79d',
  '91fc3cc6-1bd5-4da3-8072-d7f7a7090065'
);

DELETE FROM orders WHERE id IN (
  'f29d6725-e3ce-4a4b-8eb1-5823a14b893c',
  '01bb1f14-be01-4794-bee2-e0bcf0d91640',
  'fc0840d4-84bb-4af0-9f35-ebd364805f97',
  'a62ddecd-71c5-4d48-9c8a-d1039e11a33f',
  'd5d37e66-c3f7-4b3e-91aa-cc221ac36710',
  '3d91fecd-fab0-4411-996c-f6ec22abd79d',
  '91fc3cc6-1bd5-4da3-8072-d7f7a7090065'
);