# 1.6.0 (December 08, 2025)

* Add support for presigned urls fir trigger + Read action
* Add support for S3 providers
* Update `Sailor` version to 2.7.7
* Update dev dependencies
* Update `component-commons-library` version to 4.0.0
* Remove unused `elasticio-node` dependency
* Update the Node engine to version 24.x.

# 1.5.2 (September 23, 2022)

* Update Sailor version to 2.6.29
* Get rid of vulnerabilities in dependencies
* Update component-commons-library version to 3.0.2
* Update oih-standard-library version to 2.0.3

# 1.5.1 (May 20, 2022)
* Fixed bug in `Get New and Updated S3 Objects` trigger when selected Emit Behaviour - Fetch All

# 1.5.0 (May 20, 2022)
* Created new `Read file` action instead of existing due to incorrect output metadata, old one set as deprecated 
* Fix memory leak for `Read file` action and `Get New and Updated S3 Objects` trigger, also added attachment url in message body to them
* Default value for environment variable `ATTACHMENT_MAX_SIZE` increased from `10000000` (almost **10** MB) to `104857600` bytes (**100** MB)
* Implemented additional check attachments size  in `Get New and Updated S3 Objects` trigger
* Get rid of vulnerabilities in dependencies

# 1.4.3 (April 22, 2022)
* Update `component-commons-library` to 2.0.2
* Update `oih-standard-library` to 2.0.2
* Update `elasticio-sailor-nodejs` to 2.6.27
* Added component-pusher to circleci
* Fix dependencies

# 1.4.2 (November 26, 2021)

* Upgrade sailor version to 2.6.26
* Reduced the size of component icon file

# 1.4.1 (November 12, 2020)

## General Changes
    * Upgrade to sailor 2.6.18
    * Annual audit of the component code to check if it exposes a sensitive data in the logs
    * Annual npm vulnerabilities audit

# 1.4.0 (June 5, 2020)

## General Changes
    * Add Upsert File Action
    * Update dependencies
    * Verify Credentials now checks for access to buckets.
    * Update to Node v 14
    * Replace Component completeness matrix to version 2.3


# 1.3.1 (May 22, 2020)

## General Changes
    * Update sailor version to 2.6.7

# 1.3.0 (February 13, 2020)

## General Changes
    * Add Get New and Updated S3 Objects trigger
    * Fix `Error! Cannot convert undefined or null to object` error on no attachments object in message in Write file action
    * Add attachment size limitation
    * Add empty response to Delete file action when file already not exists
    * Add possibility to retrieve more than 1,000 files for 'Get filenames' action
    * Improved error handling for Get filenames action
    * Removed invalid docs job from circle ci
    
# 1.2.1 (December 26, 2019)

## General Changes
    * Update sailor version to 2.5.4
    
# 1.2.0 (December 19, 2019)

## General Changes
    * Add `Rename file` action
    * Rename field `Bucket Name` to `Bucket Name and Folder`
    * Make `Bucket Name and Folder` field non required
    * Use one Client for all actions
    * Update Sailor version

## 1.1.0 (June 18, 2019)

    * Add `Write file` action
    * Add `Read file` action
    * Add `Get filenames` action
    * Add `Delete file` action
    * Update versions of dependencies
    * Update README.md

## 1.0.0 (April 28, 2016)

    * Initial release
