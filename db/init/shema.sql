-- Adminer 5.4.1 MySQL 8.4.7 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `ballots`;
CREATE TABLE `ballots` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `electionID` int unsigned DEFAULT NULL,
  `ballotType` enum('simple','first','second') NOT NULL DEFAULT 'simple',
  `titleDe` text NOT NULL,
  `titleEn` text NOT NULL,
  `descriptionDe` text NOT NULL,
  `descriptionEn` text NOT NULL,
  `minChoices` int NOT NULL,
  `maxChoices` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `electionID` (`electionID`),
  CONSTRAINT `ballotsElectionFk` FOREIGN KEY (`electionID`) REFERENCES `elections` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `choices`;
CREATE TABLE `choices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ballotID` int unsigned NOT NULL,
  `sortIndex` int unsigned NOT NULL,
  `labelDe` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `labelEn` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `technicalNone` tinyint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ballotID` (`ballotID`),
  CONSTRAINT `choices_ibfk_1` FOREIGN KEY (`ballotID`) REFERENCES `ballots` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
  `cKey` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `cVal` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`cKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `config` (`cKey`, `cVal`, `description`) VALUES
('defaultLanguage',	'de',	'Standard language of the application (de/en)'),
('researchHideQr',	'0',	'If set, QR code is hidden in the voting/verifier UI (research mode)'),
('researchVerifierOffset',	'0',	'If set, verifier display is offset by one (research mode)'),
('verifierReportUseSimpleView',	'0',	'If set, the verifier \"Problem melden\" button opens the simple report view instead of the popup.'),
('verifierShowAllBallots',	'1',	'If set, verifier lookup shows all ballots of a voter instead of only the QR ballot / first/second pair'),
('votingDisableInvalidButtonWhenValid',	'0',	'If set, the dedicated \"invalid vote\" button is disabled when the current selection is valid (only relevant when votingShowInvalidVoteButton=1).'),
('votingDisableSubmitOnInvalid',	'0',	'If set, the normal \"submit vote\" button is disabled when the current selection is invalid (only relevant when votingShowInvalidVoteButton=1).'),
('votingEnablePublicReport',	'0',	'If set, anyone (also not logged in) can create a problem report ticket from the voting UI.'),
('votingHideBallotAfterSubmit',	'1',	'If set, hide the ballot/selection UI after submitting a vote (show only QR/finish area).'),
('votingQrOnlyLastBallot',	'1',	'If set, the verifier QR code in the voting UI is only shown after the last ballot; previous ballots do not show a QR code.'),
('votingShowInvalidVoteButton',	'1',	'If set, the voting UI shows a dedicated \"invalid vote\" button (instead of one combined button).');

DROP TABLE IF EXISTS `elections`;
CREATE TABLE `elections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(64) NOT NULL,
  `nameDe` varchar(255) NOT NULL,
  `nameEn` varchar(255) DEFAULT NULL,
  `descriptionDe` text NOT NULL,
  `descriptionEn` text NOT NULL,
  `startsAt` datetime DEFAULT NULL,
  `endsAt` datetime DEFAULT NULL,
  `isActive` tinyint unsigned NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slugUnique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `images`;
CREATE TABLE `images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `imgKey` varchar(64) NOT NULL,
  `mimeType` varchar(64) NOT NULL,
  `data` longblob NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `imgKey` (`imgKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userId` int unsigned DEFAULT NULL,
  `component` enum('voting','verifier','admin-api') NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `level` enum('INFO','WARN','ERROR') NOT NULL DEFAULT 'INFO',
  `userAgent` text,
  `details` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `publicTexts`;
CREATE TABLE `publicTexts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `pageKey` varchar(50) NOT NULL,
  `lang` varchar(5) NOT NULL,
  `html` text NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_page_lang` (`pageKey`,`lang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `publicTexts` (`id`, `pageKey`, `lang`, `html`, `updatedAt`) VALUES
(1,	'home',	'de',	'Das ist eine info4',	'2025-12-11 02:04:06'),
(2,	'home',	'en',	'<h2>Welcome</h2><p>This is the home page …</p>',	'2025-11-26 17:34:41'),
(3,	'verify',	'de',	'<h2>Hinweise zur Veri2fizierung</h2><p>…</p>',	'2025-11-29 23:08:53'),
(4,	'verify',	'en',	'<h2>Verification Info</h2><p>…</p>',	'2025-11-26 17:34:41'),
(5,	'login',	'de',	'3',	'2025-12-12 04:32:30'),
(6,	'login',	'en',	'<h2>Welcome</h2><p>This is the login page …</p>',	'2025-11-26 18:02:41'),
(7,	'votingInfo',	'de',	'3',	'2025-12-12 04:32:28'),
(8,	'votingInfo',	'en',	'3',	'2025-12-12 04:32:28'),
(454,	'systemTitle',	'de',	'Wahl-App',	'2025-12-14 00:43:50'),
(455,	'systemTitle',	'en',	'Voting App',	'2025-12-14 00:43:50'),
(458,	'appTitle',	'de',	'Wahl-App',	'2025-12-14 00:43:50'),
(459,	'appTitle',	'en',	'Voting App',	'2025-12-14 00:43:50');

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userId` int unsigned DEFAULT NULL,
  `ballotId` int unsigned DEFAULT NULL,
  `electionId` int unsigned DEFAULT NULL,
  `contact` text,
  `message` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolvedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tickets_user` (`userId`),
  KEY `idx_tickets_ballot` (`ballotId`),
  KEY `idx_tickets_election` (`electionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `userChoices`;
CREATE TABLE `userChoices` (
  `ballotsID` int unsigned NOT NULL,
  `choiceID` int unsigned NOT NULL,
  `userID` int unsigned NOT NULL,
  `isValid` tinyint unsigned NOT NULL,
  `createdAt` datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY `ballotsID` (`ballotsID`),
  KEY `choiceID` (`choiceID`),
  KEY `userID` (`userID`),
  CONSTRAINT `userChoices_ibfk_1` FOREIGN KEY (`ballotsID`) REFERENCES `ballots` (`id`),
  CONSTRAINT `userChoices_ibfk_3` FOREIGN KEY (`userID`) REFERENCES `users` (`id`),
  CONSTRAINT `userChoices_ibfk_4` FOREIGN KEY (`choiceID`) REFERENCES `choices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userName` char(50) NOT NULL,
  `pwHash` varbinary(255) NOT NULL,
  `role` enum('admin','voter','showroom') NOT NULL,
  `isActive` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (`id`, `userName`, `pwHash`, `role`, `isActive`) VALUES
(1,	'admin',	UNHEX('246172676F6E32696424763D3139246D3D31393435362C743D332C703D312472445846505A69377736444A4E767A56382F376A4B412450726658397A63616338564762583239706B47546D4E624B41564A51344775424636737672467A4B783559'),	'admin',	1),
(1079,	'usr_wo3G',	UNHEX('246172676F6E32696424763D3139246D3D31393435362C743D332C703D3124524F774D693952676D36496D6F6E3652696E5842697724314E4D4C654879503331355A2F4E3639417256546638316D376A4F3845535736623955725A656B64483567'),	'voter',	1),
(1080,	'user_xchE',	UNHEX('246172676F6E32696424763D3139246D3D31393435362C743D332C703D31246E524A6376307168564F37322B783674475231344751245754694A51595851564769504A67544468536B4D314470586C41496C2F68744C496C7250507665552F6155'),	'voter',	1);

DROP TABLE IF EXISTS `verifierSessions`;
CREATE TABLE `verifierSessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userID` int unsigned NOT NULL,
  `ballotsID` int unsigned NOT NULL,
  `token` char(64) NOT NULL,
  `tokenValidUntil` datetime NOT NULL,
  `windowValidUntil` datetime NOT NULL,
  `isActive` tinyint unsigned NOT NULL DEFAULT '1',
  `wasLookedUp` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tokenUnique` (`token`),
  KEY `userID` (`userID`),
  KEY `ballotsID` (`ballotsID`),
  CONSTRAINT `verifierSessions_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`),
  CONSTRAINT `verifierSessions_ibfk_2` FOREIGN KEY (`ballotsID`) REFERENCES `ballots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `votes`;
CREATE TABLE `votes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userID` int unsigned NOT NULL,
  `voted` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userID` (`userID`),
  CONSTRAINT `votes_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2025-12-17 01:34:37 UTC