parameters:
- name: vc_api_id
  type: string
  default: $(VERACODE_API_ID)
- name: vc_api_key
  type: string
  default: $(VERACODE_API_KEY)
- name: passed_jar_folder
  type: string
  default: '$(system.defaultworkingdirectory)/pipeline_storage/build'    # --> binary should be placed in this folder by DevOps

steps:
# Step 1: Install Veracode CLI & Perform Auto-Packaging
- task: Bash@3
  displayName: 'Install Veracode CLI and Package Scan'
  inputs:
    targetType: 'inline'
    script: |
      echo "Installing Veracode CLI..."
      curl -fsS https://tools.veracode.com/veracode-cli/install | sh
      
      echo "Running Veracode Auto Packaging..."
      ./veracode package -das $(Build.SourcesDirectory) --output ${{parameters.passed_jar_folder}}

      # Check if packaging succeeded
      if [ ! -d "${{parameters.passed_jar_folder}}" ] || [ -z "$(ls -A ${{parameters.passed_jar_folder}})" ]; then
        echo "Error: Packaging failed. No output files found."
        exit 1
      fi

      echo "Auto-packaging completed successfully."

# Step 2: Log Parameters
- script: |
    echo 'This is parameters set path: ${{parameters.passed_jar_folder}}'
    echo ${{parameters.vc_api_id}} 
    echo ${{parameters.vc_api_key}}

# Step 3: Display Policy Scan Version
- script: |
    echo '==> Policy_Scan script_version: Config-V22'
  displayName: VERSION_POLICY_SCAN_SCRIPT

# Step 4: Show All Folder Content
- script: |
    echo "Show all folder content"
    find "$(System.DefaultWorkingDirectory)" -exec ls -l {} + 
  displayName: 'Show all folder content'

# Step 5: Extract Application Name & Set Variables
- script: |
    files=`find ${{parameters.passed_jar_folder}}/ \( -name "*.jar" -o  -name "*.war" -o  -name "*.py" -o -name "*.zip" \)`
    for file in $files; do
      organization_name=`echo $(Build.Repository.Uri) | cut -d '/' -f 3 | cut -d '@' -f1`
      echo "==> Organization Name hosting this project ==>" $organization_name
      echo "==> Project Name containing the application repo ==>" $(Build.Repository.Name)

      if [[ $file == *".jar" ]]; 
        then
          app_name=`basename $file |  awk -F 'jar' '{print $1}'`
      elif [[ $file == *".war" ]];
        then
          app_name=`basename $file |  awk -F 'war' '{print $1}'`
      elif [[ $file == *".py" ]];
        then
          app_name=`basename $file |  awk -F 'py' '{print $1}'`
      elif [[ $file == *".zip" ]];
        then
          echo "Looking for zip file"
          app_name=`basename $file |  awk -F 'zip' '{print $1}'`
      else
        echo "==> Unsupported file format for Veracode scanning."
      fi
          
      app_name=`echo ${app_name:0:-1}`  # Removing last dot from filename
      profile_name=$app_name"__$(System.TeamProject)__$organization_name-DPW"
      echo "==> Profile build based on JAR-File-Name ==>" $profile_name
      echo "==> App name being scanned ==>" $app_name
      echo "##vso[task.setvariable variable=current_app_name;isoutput=true]$app_name"
      echo "##vso[task.setvariable variable=app_profile_name;isoutput=true]$profile_name"
    done;
  name: 'Retrieving_applicaton_name'

# Step 6: Display Application Profile Name
- script: |
     echo "==+> This is app_profile name ==>" $(Retrieving_applicaton_name.app_profile_name)
  displayName: 'App-Profile_Name'

# Step 7: Run Veracode Policy Scan
- task: Veracode@3
  inputs:
    ConnectionDetailsSelection: 'Credentials' # 'Endpoint' if service connection is used
    apiId: '${{parameters.vc_api_id}}'
    apiKey: '${{parameters.vc_api_key}}'
    veracodeAppProfile: '$(Retrieving_applicaton_name.app_profile_name)' # App-Profile based on project/repo
    version: '$(build.buildNumber)'
    filepath: '${{parameters.passed_jar_folder}}'
    createProfile: 'true'
    optargs: '-policy DPW-Veracode-Recommended-SAST-SCA-V2 -teams DPW_Security'
    failBuildIfUploadAndScanBuildStepFails: true
    importResults: true
    failBuildOnPolicyFail: true
    maximumWaitTime: '1440' # 24 hours
    toplevel : true
    includenewmodules : true
    deleteincompletescan: 0
  displayName: POLICY SCAN
  condition: succeededOrFailed()