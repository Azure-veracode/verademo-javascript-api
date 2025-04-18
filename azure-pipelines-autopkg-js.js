#This script will do the autopackaging and upload and scan in the Veracode portal

# trigger:
# - main

# pool:
#   vmImage: ubuntu-latest

steps:
- task: Bash@3
  displayName: 'Install Veracode CLI and Package Scan'
  inputs:
    targetType: 'inline'
    script: |
      curl -fsS https://tools.veracode.com/veracode-cli/install | sh
      ./veracode package -das $(Build.SourcesDirectory) --output ./verascan

      # Check if the verascan directory exists
      if [ ! -d "verascan" ]; then
        echo "Error: verascan directory not found."
        exit 1
      fi

- task: PublishBuildArtifacts@1
  displayName: 'Publish Verascan Artifact'
  inputs:
    pathToPublish: 'verascan'
    artifactName: 'VeracodeScanResults'

- task: Veracode@3
  inputs:
    ConnectionDetailsSelection: 'Service Connection'
    AnalysisService: 'Veracode-Arun-GM'
    veracodeAppProfile: 'Recent-1'
    version: '$(build.buildNumber)'
    filepath: './verascan'
    importResults: true
    maximumWaitTime: '360'