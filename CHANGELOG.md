# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 2.7.2

## Fixed

- Fixed bug that caused app to error out during saving/synchronization after adding a field to a record

## 2.7.1

### Fixed

- Fixed bug that caused app to require subscription when using custom server
- Fixed bug that prevented ctrl+f / type-to-search after window regained focus

## 2.7.0

### Added

- Started a changelog!
- New "tags" section in menu that allows filter by a given tag

### Changed

- Fields in list view are now displayed horizontally in a scrollable container
- Displayed fields in list view are no longer limited to 4
- Editing fields now happens in a dialog instead of inline. This improves the experience
  on mobile and prevents accidental edits.
- Field values are now truncated in the record view. To view the full value, select the
  field by clicking on it.
- Categories have been replaced with 'tags'. Records can have multiple tags.

### Removed

- The hover-to-show feature has been removed from the list view as it didn't provide
  enough value to justify possible security risks.
