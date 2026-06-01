-- Add nullable slug first so existing rows can be backfilled before enforcing uniqueness.
ALTER TABLE `sites` ADD COLUMN `slug` VARCHAR(191) NULL;

UPDATE `sites`
SET `slug` = CONCAT(
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(`url`, '^https?://', ''),
        '^www\\.',
        ''
      ),
      '[:/?#].*$',
      ''
    )
  ),
  '-',
  `id`
)
WHERE `slug` IS NULL OR `slug` = '';

UPDATE `sites`
SET `slug` = CONCAT(
  REGEXP_REPLACE(`slug`, '[^a-zA-Z0-9._-]+', '-'),
  '-',
  `id`
)
WHERE `slug` REGEXP '[^a-zA-Z0-9._-]';

UPDATE `sites`
SET `slug` = CONCAT('site-', `id`)
WHERE `slug` IS NULL OR `slug` = '' OR `slug` = CONCAT('-', `id`);

ALTER TABLE `sites` MODIFY `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `sites_slug_key` ON `sites`(`slug`);
