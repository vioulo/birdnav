-- Add nullable slug first so existing rows can be backfilled before enforcing uniqueness.
ALTER TABLE `sites` ADD COLUMN `slug` VARCHAR(191) NULL;

CREATE TEMPORARY TABLE `_site_slug_backfill` AS
SELECT
  `numbered`.`id`,
  CASE
    WHEN `numbered`.`base_slug` = '' THEN CONCAT('site-', `numbered`.`id`)
    WHEN `numbered`.`slug_index` = 1 THEN `numbered`.`base_slug`
    ELSE CONCAT(
      LEFT(`numbered`.`base_slug`, 191 - CHAR_LENGTH(CONCAT('-', `numbered`.`slug_index`))),
      '-',
      `numbered`.`slug_index`
    )
  END AS `slug`
FROM (
  SELECT
    `normalized`.`id`,
    `normalized`.`base_slug`,
    ROW_NUMBER() OVER (PARTITION BY `normalized`.`base_slug` ORDER BY `normalized`.`id`) AS `slug_index`
  FROM (
    SELECT
      `id`,
      LEFT(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
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
            '[^a-zA-Z0-9._-]+',
            '-'
          ),
          '(^-+|-+$)',
          ''
        ),
        191
      ) AS `base_slug`
    FROM `sites`
  ) AS `normalized`
) AS `numbered`;

UPDATE `sites` AS `site`
INNER JOIN `_site_slug_backfill` AS `backfill`
  ON `backfill`.`id` = `site`.`id`
SET `site`.`slug` = `backfill`.`slug`
WHERE `site`.`slug` IS NULL OR `site`.`slug` = '';

DROP TEMPORARY TABLE `_site_slug_backfill`;

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
