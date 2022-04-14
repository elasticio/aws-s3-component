# 1.4.2 (April 15, 2022)

* Update `component-commons-library` to v2.0.2
* Update `oih-standard-library` to v2.0.2
* Update `elasticio-sailor-nodejs` to v2.6.27
* Added component-pusher to circleci
* Fix dependencies

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
