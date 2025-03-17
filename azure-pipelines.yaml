# Starter pipeline
# Start with a minimal pipeline that you can customize to build and deploy your code.
# Add steps that build, run tests, deploy, and more:
# https://aka.ms/yaml

trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:

- task: ArchiveFiles@2
  inputs:
    rootFolderOrFile: '$(Build.SourcesDirectory)'
    includeRootFolder: true
    archiveType: 'zip'
    archiveFile: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
    replaceExistingArchive: true

- task: PublishBuildArtifacts@1
  inputs:
    PathtoPublish: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
    ArtifactName: 'drop'
    publishLocation: 'Container'

- task: Veracode@3
  inputs:
    ConnectionDetailsSelection: 'Service Connection'
    AnalysisService: 'Veracode-Arun-GM'
    veracodeAppProfile: 'Recent'
    version: '$(build.buildNumber)'
    filepath: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
    importResults: true
    failBuildOnPolicyFail: true
    maximumWaitTime: '360'