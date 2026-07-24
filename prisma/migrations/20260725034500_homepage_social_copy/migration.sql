UPDATE "SeoRecord"
SET
  "title"='Technology That Moves Business Forward',
  "description"='Fast technology quotations, expert advice, nationwide delivery, installation and ongoing support for South African businesses.',
  "openGraphTitle"='Innozanzi — Technology That Moves Business Forward',
  "openGraphDescription"='Fast quotations. Expert advice. Nationwide delivery, installation and ongoing support for your business.',
  "openGraphImage"='/social/innozanzi-share.png',
  "twitterTitle"='Innozanzi — Technology That Moves Business Forward',
  "twitterDescription"='Fast quotations. Expert advice. Nationwide delivery, installation and ongoing support for your business.',
  "twitterImage"='/social/innozanzi-share.png',
  "updatedAt"=CURRENT_TIMESTAMP
WHERE "entityType"='STATIC_PAGE' AND "entityId"='homepage';
